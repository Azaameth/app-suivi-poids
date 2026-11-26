package io.github.azaameth.machimoto;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin de l'appli (pas un paquet npm) : à enregistrer avant le démarrage du pont.
        registerPlugin(CoffreAppareilPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
