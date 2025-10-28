<template>
  <ion-page>
    <!-- HEADER -->
    <ion-header translucent >
      <ion-toolbar style="--background: #fff8f0;">
        <ion-img 
          src="/assets/logocouleur.svg" 
          alt="Clanimo Logo" 
          style="height: 30px; margin-left: 20px;"  
          slot="start"
        />
      </ion-toolbar >
    </ion-header>
    
    <ion-content :fullscreen="true" class="landing">
      
      <!-- HERO -->
      <section class="hero">
        <div class="hero-inner">
          <h1 class="headline">Vos chiens. Vos amis. <br> Votre communauté. </h1>
          <p>Clanimo est l’application qui rapproche les amoureux des chiens et leur pitou. </p>
          <p >En quelques clicks, découvre les autres passionnés des chiens dans ton quartier avec qui tu pourras échanger!</p>
          <div class="cta">
            <ion-button class="btn" size="large" href="https://clanimo.netlify.app/" target="_blank" >Joins-toi à la communauté</ion-button>
          </div>
        </div>

      </section>
      
      <!-- AVANTAGES -->
      <section class="advantages">
        <h2 class="list-header">Pourquoi rejoindre la communauté Clanimo?</h2>
        <div class="advantages-grid">
          <div class="advantage-item">
            <img src="/assets/icon-profile.svg" alt="Profil personnalisé" />
            <div class="texte">
            <h3>Des profils qui vous ressemble</h3>
            <p>Montrez au monde la personnalité unique de vos chiens ! Créez un profil avec leurs plus belles photos, racontez leurs petites habitudes et laissez la magie des connexions opérer. Plus qu’un profil, c’est une vitrine de votre complicité.</p>
            </div>
            
          </div>
          <div class="advantage-item">
            <img src="/assets/icon-event.svg" alt="Événements et promenades" />
            <div class="texte">
                <h3>Des sorties qui rassemblent</h3>
                <p>Ne promenez plus jamais votre chien seul ! Rejoignez des balades collectives, participez à des événements canins ou organisez vos propres rendez-vous. À deux, à trois ou à dix, chaque promenade devient une nouvelle aventure à partager.</p>
            </div>

          </div>
          <div class="advantage-item">
            <img src="/assets/icon-community.svg" alt="Communauté chiens" />
            <div class="texte">
                <h3>Une communauté qui vous comprend</h3>
                <p>Ici, vous n’êtes jamais seul : échangez avec des passionnés, partagez vos expériences et créez de véritables amitiés. Parce que nos chiens rapprochent les cœurs, rejoignez une communauté où chaque rencontre compte.</p>
            </div>
            
          </div>
        </div>
        <p>Et en plus, c’est gratuit!</p>
      </section>
      
      <!-- FONCTIONNALITÉS -->
      <section class="fonctionnalities">
        <h2 class="list-header">Découvrez les fonctionnalités de Clanimo</h2>
        <div class="fonctions">
            <ion-list>
          <ion-item>
            <ion-label>
                <h3>Profil Utilisateur</h3>
                <p> Créez et personnalisez votre profil pour présenter vos passions et vos informations principales.
                </p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
                <h3>Profil Chien</h3>
                <p> Ajoutez vos chiens avec photos, race, âge et préférences pour faciliter les rencontres et les promenades.
                </p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
                <h3>Notifications</h3>
                <p>Recevez des alertes pour les événements, promenades et messages importants.
                </p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
                <h3>Rencontre avec carte intégrée</h3>
                <p>Trouvez des parcs et lieux de rencontre pour chiens grâce à une carte interactive directement dans l’app.
                </p>
            </ion-label>
          </ion-item>
          <ion-item>
            <ion-label>
                <h3>Messagerie</h3>
                <p> Échangez facilement avec d’autres propriétaires dans un espace sécurisé et convivial.
                </p>
            </ion-label>
          </ion-item>
        </ion-list>
        <video 
  src="/assets/app_animation.mp4" 
  autoplay 
  loop 
  muted 
  playsinline
></video>

        </div>
      </section>
      
      <!-- TESTIMONIAL -->
<section class="social-proof ion-padding-horizontal">
    <div class="cta">
        <h2 class="list-header">Qu'attends-tu pour joindre la communauté?</h2>
        <ion-button class="btn" size="large" href="https://clanimo.netlify.app/"  target="_blank" >Clique pour obtenir l'application!</ion-button>
    </div>
  <div class="quotes-container">
    <ion-card class="quote-card">
      <ion-card-content>
        <div class="avatar-circle">CDL</div>
        <p class="quote">“Clanimo : la plus grande communauté virtuelle d'amoureux des chiens dans Montréal.”</p>
        <p class="quote-author">— Crazy Dog Lady</p>
      </ion-card-content>
    </ion-card>

    <ion-card class="quote-card">
      <ion-card-content>
        <div class="avatar-circle">PL</div>
        <p class="quote">“Grâce à Clanimo, j’ai rencontré plein de personnes partageant la même passion pour les chiens !”</p>
        <p class="quote-author">— Pet Lover</p>
      </ion-card-content>
    </ion-card>

    <ion-card class="quote-card">
      <ion-card-content>
        <div class="avatar-circle">HO</div>
        <p class="quote">“Les rencontres et les activités proposées sont géniales, mon chien adore !”</p>
        <p class="quote-author">— Happy Owner</p>
      </ion-card-content>
    </ion-card>
  </div>
</section>

      
      <!-- FOOTER -->
      <footer class="site-footer ion-padding">
        <div class="footer-inner">
          <p>© {{ new Date().getFullYear() }} Pawfect-Pack</p>
          <div class="footer-links">
            <a href="#">Confidentialité</a>
            <a href="#">Termes et conditions</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </ion-content>
  </ion-page>
</template>
<script setup lang="ts">
import { IonPage, IonHeader, IonToolbar, IonImg, IonContent, IonButton, IonListHeader, IonLabel, IonList, IonItem, IonThumbnail, IonCard, IonCardContent } from '@ionic/vue';
</script>

<style scoped>
.landing {
  --background: #fff8f0;
  font-family: "Poppins", sans-serif;
  color: #3d2c29;
}

/* HERO */
.hero {
  background: linear-gradient(135deg, #fff8f0 0%, #fce3c5 100%);
  text-align: center;
  background-image: url(/assets/hero-dog.svg);
  background-repeat: no-repeat;
  background-position: bottom;
  background-size: contain;
}
.hero-inner {
  max-width: 37.5rem;
  padding-bottom:200px;
  margin: 0 auto;
  text-align: center;
}

.hero .headline {
  font-size: 2.5rem;
  font-weight: 700;
  color: #3d2c29;
  margin-bottom: 0.9375rem;
  line-height: 1.3;
  text-align: center;
}

.hero p  {
  font-size: 1.25rem;
  margin-bottom: 0.625rem;
  color: #5b463e;
  max-width: 37.5rem;
  margin: 0 auto 1.5625rem auto;
  text-align: center;
}

.hero .btn {
  --background: #e07a5f;
  --background-hover: #d96a4e;
  --border-radius: 1.5625rem;
  font-weight: 600;
  padding: 0 1.5625rem;
  margin-bottom: 0.3125rem;
}

@media (min-width: 48rem) {
  .hero {
    flex-direction: row; 
    justify-content: center;
    text-align: left;
    padding: 3.75rem 2.5rem 12.5rem 2.5rem;
    background-position: right center;
    background-size: contain;
  }

  .hero .headline {
    font-size: 3rem;
  }

  .hero p {
    font-size: 1.4rem;
    max-width: 31.25rem;
    margin: 0 0 1.5625rem 0;
  }
}

/* Desktop (≥ 1024px) */
@media (min-width: 64rem) {
  .hero {
    padding: 6.25rem 5rem 11.25rem 5rem;
    background-size: cover;
  }

  .hero .headline {
    font-size: 3.5rem;
  }

  .hero p {
    font-size: 1.5rem;
    max-width: 37.5rem;
  }
}

/* AVANTAGES GRILLE */
.advantages {
  padding: 3.75rem;
  background: #fff;
  text-align: center;
}

.list-header {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2.5rem;
  color: #3d2c29;
}

.advantages-grid {
  display: flex;
  justify-content: space-around;
  gap: 1.875rem;
}

.advantage-item {
  width: 33%;
  background: #fff8f0;
  border-radius: 1rem;
  box-shadow: 0 0.25rem 0.75rem rgba(0,0,0,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.advantage-item:hover {
  transform: translateY(-0.3125rem);
  box-shadow: 0 0.5rem 1.125rem rgba(0,0,0,0.12);
}

.advantage-item img {
  border-radius: 1rem 1rem 0 0;
  max-width: 100% ;
}
.advantage-item .texte{
  padding: 0 1.875rem 0.625rem 1.875rem;
}
.advantage-item h3{
  color: #3d2c29;
  font-size: 1.25rem;
  font-weight: bold;
  line-height: 1.5rem;
}
.advantages p{
  font-size: 1.625rem;
  font-style: italic;
  color: #d96a4e;
  font-weight: bold;
}

.advantage-item p {
  font-size: 1rem;
  color: #5b463e;
  font-style: normal;
  text-align: justify;
  line-height: 1.5;
  font-weight: normal;
}

@media (max-width: 64rem) {
  .list-header {
    font-size: 1rem;
  }
  .advantages p {
    font-size: 1.375rem;
  }
}

@media (max-width: 48rem) {
  .advantages {
    padding: 2.5rem 0.9375rem;
  }
  .list-header {
    font-size: 0.75rem;
  }
  .advantages-grid {
    flex-direction: column;
    align-items: center;
  }
  .advantage-item {
    width: 100%;
    max-width: 25rem;
  }
}

/* FONCTIONNALITÉS */
.fonctionnalities {
  padding: 2.5rem 1.25rem;
  background: #f5e4e0;
  font-family: 'Poppins', sans-serif;
}

.list-header {
  text-align: center;
  font-size: 2rem;
  color: #3d2c29;
  margin-bottom: 1.875rem;
  position: relative;
}

.list-header::after {
  content: '';
  display: block;
  width: 5rem;
  height: 0.25rem;
  background: #ff9f80;
  margin: 0.5rem auto 0;
  border-radius: 0.125rem;
}

.fonctions {
  display: flex;
  gap: 1.875rem;
  justify-content: space-evenly;
  align-items: center;
  flex-wrap: wrap;
  --background-color: none;
}

ion-list {
  flex: 1 1 25rem;
  display: flex;
  flex-direction: column;
  gap: 0.9375rem;
  max-width: 50rem;
  padding: 3.125rem;
  background: none;
}

ion-item {
  display: flex;
  flex-direction: column;
  --background: #fff;
  background: #fff;
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 0.25rem solid #ff9f80;
  box-shadow: 0 0.3125rem 0.9375rem rgba(0,0,0,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
}

ion-item:hover {
  transform: translateY(-0.3125rem) scale(1.02);
  box-shadow: 0 0.625rem 1.5625rem rgba(0,0,0,0.15);
}

ion-item h3 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 0.625rem;
  color: #3d2c29;
  position: relative;
  transition: color 0.3s ease;
}

ion-item:hover h3 {
  color: #ff6f3c;
}

ion-item h3::before {
  content: '🐾';
  margin-right: 0.5rem;
  display: inline-block;
  transform: scale(1);
  transition: transform 0.3s ease;
}

ion-item:hover h3::before {
  transform: scale(1.3) rotate(20deg);
}

ion-item p {
  font-size: 1.25rem;
  line-height: 1.5;
  color: #5b463e;
  margin: 0;
  transition: transform 0.3s ease, color 0.3s ease;
}

ion-item:hover p {
  transform: translateX(0.3125rem);
  color: #7a5a48;
}

.fonctions video {
  flex: 1 1 25rem;
  max-width: 31.25rem;
  width: 100%;
  border-radius: 0.75rem;
  animation: fadeIn 2s ease-in-out;
}

@keyframes fadeIn {
  0% {opacity: 0; transform: translateY(1.25rem);}
  100% {opacity: 1; transform: translateY(0);}
}

@media (max-width: 64rem) {
  .list-header {
    font-size: 1.8rem;
  }

  ion-list {
    padding: 1.875rem;
  }

  ion-item h3 {
    font-size: 1.2rem;
  }

  ion-item p {
    font-size: 1.1rem;
  }

  .fonctions {
    gap: 1.25rem;
  }

  .fonctions video {
    max-width: 25rem;
  }
}

@media (max-width: 48rem) {
  .fonctions {
    flex-direction: column;
    align-items: center;
  }

  ion-list {
    padding: 1.25rem;
    max-width: 100%;
  }

  ion-item {
    padding: 0.9375rem;
  }

  ion-item h3 {
    font-size: 1.1rem;
    text-align: center;
  }

  ion-item p {
    font-size: 1rem;
    text-align: center;
  }

  .fonctions video {
    max-width: 100%;
    margin-top: 1.25rem;
  }

  .list-header {
    font-size: 1.5rem;
  }
}

/* CTA */
section.cta {
  padding: 3.125rem;
  text-align: center;
  background: #fff;
}

section.cta h2 {
  font-size: 2rem;
  margin-bottom: 1.25rem;
  color: #3d2c29;
}

.cta ion-button {
  --background: #e07a5f;
  --background-hover: #d96a4e;
  --border-radius: 1.875rem;
  padding: 0 1.875rem;
  font-weight: 600;
}

/* TESTIMONIAL */
.avatar-circle {
  width: 3.75rem;
  height: 3.75rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9f80, #ff6f3c);
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.9375rem auto;
  transition: transform 0.3s ease;
}

.quote-card:hover .avatar-circle {
  transform: scale(1.1) rotate(-5deg);
}

.social-proof {
  background: #fff;
  background-image: url(/assets/walk.svg);
  background-repeat: no-repeat;
  background-position: bottom center;
  background-size: cover;
  padding: 3.75rem 1.25rem 12.5rem;
  text-align: center;
  font-family: 'Poppins', sans-serif;
}

.section-header {
  font-size: 2rem;
  color: #3d2c29;
  margin-bottom: 2.5rem;
  position: relative;
}

.section-header::after {
  content: '';
  display: block;
  width: 3.75rem;
  height: 0.25rem;
  background: #ff9f80;
  margin: 0.5rem auto 0;
  border-radius: 0.125rem;
}

.quotes-container {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  justify-content: center;
}

.quote-card {
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 0.375rem 1.125rem rgba(0,0,0,0.1);
  padding: 1.25rem;
  max-width: 18.75rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  margin-top: 3.125rem;
}

.quote-card:hover {
  transform: translateY(-0.3125rem) scale(1.03);
  box-shadow: 0 0.75rem 1.875rem rgba(0,0,0,0.15);
}

.quote {
  font-size: 0.95rem;
  color: #5b463e;
  margin-bottom: 0.625rem;
  line-height: 1.4;
  font-style: italic;
}

.quote-author {
  font-size: 0.85rem;
  font-weight: 600;
  color: #3d2c29;
}

@media (max-width: 56.25rem) {
  .quotes-container {
    flex-direction: column;
    align-items: center;
  }
}

/* FOOTER */
.site-footer {
  background: #3d2c29;
  color: #fff8f0;
  padding: 1.875rem 1.25rem;
  text-align: center;
}

.footer-inner {
  max-width: 56.25rem;
  margin: auto;
}

.footer-links {
  margin-top: 0.625rem;
}

.footer-links a {
  color: #fce3c5;
  margin: 0 0.625rem;
  text-decoration: none;
  font-size: 0.9rem;
}

.footer-links a:hover {
  text-decoration: underline;
}
</style>

