# Sécurité

## Signaler une vulnérabilité

Merci de **ne pas ouvrir d'issue publique**. Utilisez le signalement privé de GitHub :
onglet **Security → Report a vulnerability** du dépôt
([lien direct](https://github.com/Azaameth/app-suivi-poids/security/advisories/new)).

Indiquez si possible : la version (menu du profil dans l'appli), les étapes pour reproduire,
l'impact estimé. Réponse visée sous 7 jours ; projet personnel maintenu bénévolement.

## Périmètre

| Dans le périmètre                                         | Hors périmètre                                          |
| --------------------------------------------------------- | ------------------------------------------------------- |
| Chiffrement des pesées, phrase secrète, code de secours   | La clé d'API Firebase du code : publique par conception |
| Règles Firestore (accès aux données d'un autre compte)    | Attaques nécessitant un appareil déjà déverrouillé      |
| Application web https://machimoto.web.app et ses en-têtes | Déni de service, quotas du plan gratuit Firebase        |
| Fuite de secrets dans le dépôt                            | Vulnérabilités des outils de dev seuls (non livrés)     |

## Modèle de sécurité en bref

- Poids et notes chiffrés **dans l'appareil** (AES-GCM 256) ; la clé de données est encapsulée par
  la phrase secrète (PBKDF2-SHA256, 600 000 itérations) et par un code de secours de 160 bits.
- Le serveur ne voit que du chiffré, les dates et la clé encapsulée.
- Sur le web, la clé et la phrase ne sont jamais écrites sur disque.

Détails : [README](README.md#confidentialité-et-sécurité) et le registre des décisions de
[docs/plan-projet.md](docs/plan-projet.md).
