// C'EST COINCHÉ — lecteur de musique flottant (présent sur toutes les pages)
//
// Pour ajouter/changer des pistes : mets le fichier dans assets/music/
// et ajoute/modifie une ligne ci-dessous.
const PLAYLIST = [
  { title: 'Ambiance C\'est Coinché', src: 'assets/music/USB002.mp3' },
];

document.addEventListener('DOMContentLoaded', () => {
  const player = document.createElement('div');
  player.className = 'music-player';
  player.innerHTML = `
    <button id="music-prev" title="Piste précédente">«</button>
    <button id="music-toggle" title="Lecture / Pause">▶</button>
    <button id="music-next" title="Piste suivante">»</button>
    <span class="track" id="music-track"></span>
    <input type="range" id="music-volume" min="0" max="1" step="0.01" title="Volume">
  `;
  document.body.appendChild(player);

  const audio = new Audio();
  audio.loop = false;

  const toggleBtn = document.getElementById('music-toggle');
  const trackEl = document.getElementById('music-track');
  const volumeSlider = document.getElementById('music-volume');

  let volume = parseFloat(localStorage.getItem('cc-music-volume'));
  if (isNaN(volume) || volume < 0 || volume > 1) volume = 0.15;
  audio.volume = volume;
  volumeSlider.value = volume;

  volumeSlider.addEventListener('input', () => {
    volume = parseFloat(volumeSlider.value);
    audio.volume = volume;
    localStorage.setItem('cc-music-volume', volume);
  });

  let index = parseInt(localStorage.getItem('cc-music-track') || '0', 10);
  if (isNaN(index) || index < 0 || index >= PLAYLIST.length) index = 0;
  let wasPlaying = localStorage.getItem('cc-music-playing') === 'true';

  function load(i, autoplay, startTime) {
    index = (i + PLAYLIST.length) % PLAYLIST.length;
    audio.src = PLAYLIST[index].src;
    trackEl.textContent = PLAYLIST[index].title;
    localStorage.setItem('cc-music-track', index);
    localStorage.setItem('cc-music-time', '0');
    if (startTime) {
      audio.addEventListener('loadedmetadata', () => {
        audio.currentTime = startTime;
      }, { once: true });
    }
    if (autoplay) {
      audio.play().catch(() => {
        wasPlaying = false;
        toggleBtn.textContent = '▶';
        localStorage.setItem('cc-music-playing', 'false');
      });
    }
  }

  // Mémorise la position de lecture pour reprendre au même endroit
  // en changeant de page (au lieu de redémarrer la piste).
  audio.addEventListener('timeupdate', () => {
    localStorage.setItem('cc-music-time', audio.currentTime);
  });

  function setPlaying(playing) {
    wasPlaying = playing;
    localStorage.setItem('cc-music-playing', playing ? 'true' : 'false');
    toggleBtn.textContent = playing ? '⏸' : '▶';
  }

  toggleBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  });

  document.getElementById('music-prev').addEventListener('click', () => {
    load(index - 1, !audio.paused || wasPlaying);
  });

  document.getElementById('music-next').addEventListener('click', () => {
    load(index + 1, !audio.paused || wasPlaying);
  });

  audio.addEventListener('ended', () => load(index + 1, true));

  let savedTime = parseFloat(localStorage.getItem('cc-music-time'));
  if (isNaN(savedTime) || savedTime < 0) savedTime = 0;

  load(index, false, savedTime);

  // Tente l'autoplay immédiatement ; si le navigateur refuse (politique anti-autoplay),
  // on attend la première interaction de l'utilisateur pour démarrer.
  function startAudio() {
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  if (wasPlaying) {
    startAudio();
  } else {
    const onFirstInteraction = () => {
      document.removeEventListener('click', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
      document.removeEventListener('touchstart', onFirstInteraction);
      startAudio();
    };
    audio.play().then(() => setPlaying(true)).catch(() => {
      document.addEventListener('click', onFirstInteraction);
      document.addEventListener('keydown', onFirstInteraction);
      document.addEventListener('touchstart', onFirstInteraction);
    });
  }
});
