package io.github.azaameth.machimoto;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.KeyStore;
import java.util.Arrays;
import java.util.regex.Pattern;

import javax.crypto.AEADBadTagException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Clé de données conservée sur le téléphone, liée à l'empreinte (D13, option C de #82).
 *
 * <p>Une clé AES-256 de l'Android Keystore, propre à chaque compte, chiffre la clé de données.
 * Elle exige une authentification biométrique forte à chaque usage (BiometricPrompt +
 * CryptoObject) : sans le doigt, même un téléphone rooté ne peut pas s'en servir. Elle est
 * invalidée si une empreinte est ajoutée au téléphone ; la phrase secrète est alors redemandée.
 * Seul le chiffré (IV + données) est rangé dans les préférences privées de l'appli.
 *
 * <p>Codes d'erreur renvoyés à JS : ANNULE (annulation, échecs répétés : la phrase reste
 * possible), INVALIDEE (clé inutilisable, oubliée), INDISPONIBLE (pas de capteur ou
 * d'empreinte), ECHEC (autre), ARGUMENT.
 */
@CapacitorPlugin(name = "CoffreAppareil")
public class CoffreAppareilPlugin extends Plugin {

    private static final String KEYSTORE = "AndroidKeyStore";
    private static final String PREFERENCES = "coffre-appareil";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int TAG_BITS = 128;
    private static final int AUTHENTIFICATEURS = BiometricManager.Authenticators.BIOMETRIC_STRONG;
    /** Identifiant Firebase : lettres, chiffres, tirets (sert de nom de clé). */
    private static final Pattern UID = Pattern.compile("[A-Za-z0-9_-]{1,128}");

    private interface Suite {
        void apres(Cipher cipher) throws Exception;
    }

    @PluginMethod
    public void disponible(PluginCall call) {
        int etat = BiometricManager.from(getContext()).canAuthenticate(AUTHENTIFICATEURS);
        JSObject resultat = new JSObject();
        resultat.put("disponible", etat == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(resultat);
    }

    @PluginMethod
    public void presente(PluginCall call) {
        String uid = uid(call);
        if (uid == null) return;
        try {
            JSObject resultat = new JSObject();
            resultat.put("presente", preferences().contains(uid) && keystore().containsAlias(alias(uid)));
            call.resolve(resultat);
        } catch (Exception e) {
            call.reject("Keystore illisible", "ECHEC", e);
        }
    }

    @PluginMethod
    public void conserver(PluginCall call) {
        String uid = uid(call);
        if (uid == null) return;
        String cle = call.getString("cle");
        if (cle == null) {
            call.reject("Clé manquante", "ARGUMENT");
            return;
        }
        byte[] brute = Base64.decode(cle, Base64.NO_WRAP);
        try {
            // Ancien chiffré retiré d'abord : il ne doit jamais survivre à la clé qui l'a produit
            // (sinon, empreinte annulée ici → « présente » mais indéchiffrable à chaque ouverture).
            effacer(uid);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, creerCle(uid));
            authentifier(call, cipher, "Déverrouiller avec l’empreinte", c -> {
                byte[] chiffre = c.doFinal(brute);
                preferences().edit().putString(uid, b64(c.getIV()) + ":" + b64(chiffre)).apply();
                call.resolve();
            }, () -> Arrays.fill(brute, (byte) 0));
        } catch (Exception e) {
            Arrays.fill(brute, (byte) 0);
            call.reject("Conservation impossible", "ECHEC", e);
        }
    }

    @PluginMethod
    public void restituer(PluginCall call) {
        String uid = uid(call);
        if (uid == null) return;
        try {
            String stocke = preferences().getString(uid, null);
            SecretKey cle = (SecretKey) keystore().getKey(alias(uid), null);
            if (stocke == null || cle == null || !stocke.contains(":")) {
                effacer(uid);
                call.reject("Aucune clé conservée", "INVALIDEE");
                return;
            }
            String[] parties = stocke.split(":", 2);
            byte[] iv = Base64.decode(parties[0], Base64.NO_WRAP);
            byte[] chiffre = Base64.decode(parties[1], Base64.NO_WRAP);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            try {
                cipher.init(Cipher.DECRYPT_MODE, cle, new GCMParameterSpec(TAG_BITS, iv));
            } catch (KeyPermanentlyInvalidatedException e) {
                // Empreinte ajoutée ou supprimée : la clé du Keystore ne servira plus jamais.
                effacer(uid);
                call.reject("Empreintes modifiées", "INVALIDEE");
                return;
            }
            authentifier(call, cipher, "Déverrouiller le coffre", c -> {
                byte[] brute;
                try {
                    brute = c.doFinal(chiffre);
                } catch (AEADBadTagException e) {
                    // Chiffré qui ne correspond plus à la clé : inutilisable, on l'oublie.
                    effacer(uid);
                    call.reject("Clé conservée illisible", "INVALIDEE");
                    return;
                }
                JSObject resultat = new JSObject();
                resultat.put("cle", b64(brute));
                Arrays.fill(brute, (byte) 0);
                call.resolve(resultat);
            }, () -> {});
        } catch (Exception e) {
            call.reject("Restitution impossible", "ECHEC", e);
        }
    }

    @PluginMethod
    public void oublier(PluginCall call) {
        String uid = uid(call);
        if (uid == null) return;
        try {
            effacer(uid);
            call.resolve();
        } catch (Exception e) {
            call.reject("Oubli impossible", "ECHEC", e);
        }
    }

    /** Demande l'empreinte ; en cas de succès, `suite` reçoit le Cipher déverrouillé. */
    private void authentifier(PluginCall call, Cipher cipher, String titre, Suite suite, Runnable fin) {
        FragmentActivity activite = getActivity();
        activite.runOnUiThread(() -> {
            BiometricPrompt.AuthenticationCallback retour = new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult resultat) {
                    try {
                        BiometricPrompt.CryptoObject objet = resultat.getCryptoObject();
                        if (objet == null || objet.getCipher() == null) throw new IllegalStateException("Cipher absent");
                        suite.apres(objet.getCipher());
                    } catch (Exception e) {
                        call.reject("Opération refusée par le Keystore", "ECHEC", e);
                    } finally {
                        fin.run();
                    }
                }

                @Override
                public void onAuthenticationError(int code, @NonNull CharSequence message) {
                    fin.run();
                    boolean indisponible = code == BiometricPrompt.ERROR_HW_NOT_PRESENT
                        || code == BiometricPrompt.ERROR_HW_UNAVAILABLE
                        || code == BiometricPrompt.ERROR_NO_BIOMETRICS
                        || code == BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL;
                    call.reject(message.toString(), indisponible ? "INDISPONIBLE" : "ANNULE");
                }
                // onAuthenticationFailed : doigt non reconnu, la fenêtre reste ouverte.
            };
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(titre)
                .setSubtitle("Professeur Machimoto")
                .setNegativeButtonText("Utiliser ma phrase secrète")
                .setAllowedAuthenticators(AUTHENTIFICATEURS)
                .setConfirmationRequired(false)
                .build();
            new BiometricPrompt(activite, ContextCompat.getMainExecutor(getContext()), retour)
                .authenticate(info, new BiometricPrompt.CryptoObject(cipher));
        });
    }

    /** Nouvelle clé du Keystore pour ce compte (remplace l'éventuelle ancienne). */
    private SecretKey creerCle(String uid) throws Exception {
        KeyGenParameterSpec.Builder spec = new KeyGenParameterSpec.Builder(
                alias(uid), KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setInvalidatedByBiometricEnrollment(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Authentification exigée à chaque usage, biométrie forte uniquement.
            spec.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG);
        } else {
            spec.setUserAuthenticationValidityDurationSeconds(-1);
        }
        KeyGenerator generateur = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE);
        generateur.init(spec.build());
        return generateur.generateKey();
    }

    private void effacer(String uid) throws Exception {
        preferences().edit().remove(uid).apply();
        KeyStore ks = keystore();
        if (ks.containsAlias(alias(uid))) ks.deleteEntry(alias(uid));
    }

    private String uid(PluginCall call) {
        String uid = call.getString("uid");
        if (uid == null || !UID.matcher(uid).matches()) {
            call.reject("Identifiant de compte invalide", "ARGUMENT");
            return null;
        }
        return uid;
    }

    private static String alias(String uid) {
        return "coffre-" + uid;
    }

    private static String b64(byte[] octets) {
        return Base64.encodeToString(octets, Base64.NO_WRAP);
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    private static KeyStore keystore() throws Exception {
        KeyStore ks = KeyStore.getInstance(KEYSTORE);
        ks.load(null);
        return ks;
    }
}
