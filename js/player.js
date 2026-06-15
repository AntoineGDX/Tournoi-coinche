// C'EST COINCHÉ — lecteur de musique flottant (présent sur toutes les pages)
//
// Pistes de démonstration dans assets/music/ — à remplacer par tes propres
// fichiers mp3 (mets-les dans assets/music/ et mets à jour la liste ci-dessous).
const PLAYLIST = [
  { title: 'Piste démo 1', src: 'assets/music/demo-1.wav' },
  { title: 'Piste démo 2', src: 'assets/music/demo-2.wav' },
];

document.addEventListener('DOMContentLoaded', () => {
  const player = document.createElement('div');
  player.className = 'music-player';
  player.innerHTML = `
    <button id="music-prev" title="Piste précédente">«</button>
    <button id="music-toggle" title="Lecture / Pause">▶</button>
    <button id="music-next" title="Piste suivante">»</button>
    <span class="track" id="music-track"></span>
  `;
  document.body.appendChild(player);

  const audio = new Audio();
  audio.volume = 0.5;
  audio.loop = false;

  const toggleBtn = document.getElementById('music-toggle');
  const trackEl = document.getElementById('music-track');

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
