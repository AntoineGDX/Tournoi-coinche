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

  function load(i, autoplay) {
    index = (i + PLAYLIST.length) % PLAYLIST.length;
    audio.src = PLAYLIST[index].src;
    trackEl.textContent = PLAYLIST[index].title;
    localStorage.setItem('cc-music-track', index);
    if (autoplay) {
      audio.play().catch(() => {
        wasPlaying = false;
        toggleBtn.textContent = '▶';
        localStorage.setItem('cc-music-playing', 'false');
      });
    }
  }

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

  load(index, false);
  if (wasPlaying) {
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
});
