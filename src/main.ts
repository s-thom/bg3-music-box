import "./style.css";

const INSTRUMENTS = ["voice", "flute", "violin", "lute", "lyre", "drum"];

const BIG_ICONS = [
  "bardic-inspiration",
  "restore-bardic-inspiration",
  "song-of-rest",
  "toss-a-coin",
];

let isPlaying = false;
let currentSong = "";

function getAllAudio() {
  return Array.from(
    document
      .querySelector("#audio")!
      .querySelectorAll<HTMLAudioElement>("audio")
  );
}

function setControlsEnabledState(enabled: boolean) {
  const prevButton = document.querySelector("#controls-prev")!;
  const playButton = document.querySelector("#controls-play")!;

  if (enabled) {
    prevButton.removeAttribute("disabled");
    playButton.removeAttribute("disabled");
  } else {
    prevButton.setAttribute("disabled", "");
    playButton.setAttribute("disabled", "");
  }
}

function setIsPlaying(playing: boolean, shouldTrack = true) {
  const previousIsPlaying = isPlaying;
  isPlaying = playing;

  const playButton = document.querySelector("#controls-play")!;
  if (isPlaying) {
    playButton.classList.add("control-pause");
    playButton.classList.remove("control-play");

    if (shouldTrack && !previousIsPlaying) {
      umami?.track("play", { song: currentSong });
    }
  } else {
    playButton.classList.remove("control-pause");
    playButton.classList.add("control-play");

    if (shouldTrack && previousIsPlaying) {
      umami?.track("pause", { song: currentSong });
    }
  }

  getAllAudio().forEach((audio) => {
    if (isPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
  });
}

function skipBackToStart() {
  umami?.track("skip-back", { song: currentSong });

  if (isPlaying) {
    setIsPlaying(false, false);
  }

  getAllAudio().forEach((audio) => {
    audio.currentTime = 0;
  });
}

async function setSong(id: string) {
  umami?.track("change-song", { song: id });
  setIsPlaying(false);
  currentSong = id;

  // Update label
  const songLabel = document.querySelector(`#label_${id}`);
  const nowPlayingLabel = document.querySelector("#now-playing-text")!;
  nowPlayingLabel.textContent = songLabel!.textContent;

  const audioContainer = document.querySelector("#audio")!;
  audioContainer
    .querySelectorAll<HTMLAudioElement>("audio")
    .forEach((audio) => {
      audio.pause();
      audio.remove();
    });

  const loadPromises = INSTRUMENTS.map((instrument) => {
    let resolve: (audio: HTMLAudioElement) => void, reject: (err?: any) => void;
    const promise = new Promise<HTMLAudioElement>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const audio = new Audio(`/music/${id}_${instrument}.ogg`);
    audio.id = `audio_${instrument}`;
    audio.volume = 0;
    audio.loop = true;
    audio.addEventListener("canplay", () => resolve(audio));
    audio.addEventListener("canplaythrough", () => resolve(audio));
    audio.addEventListener("error", () => reject());

    audioContainer.appendChild(audio);

    return promise;
  });

  setControlsEnabledState(false);
  await Promise.all(loadPromises);

  // Don't proceed if user switched to another song during loading
  if (currentSong !== id) {
    return;
  }

  // Turn on the instruments that have their checkboxes selected already
  const selectedInstrumentCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[name=instrument]")
  ).filter((checkbox) => checkbox.checked);
  selectedInstrumentCheckboxes.forEach((instrumentCheckbox) => {
    const audio = document.querySelector<HTMLAudioElement>(
      `#audio_${instrumentCheckbox.value}`
    )!;
    audio.volume = 1;
  });

  // Only enable playback buttons if there's an instrument selected
  if (selectedInstrumentCheckboxes.length > 0) {
    setControlsEnabledState(true);
  }
}

function setInstrumentPlaying(id: string, isInstrumentPlaying: boolean) {
  const audio = document.querySelector<HTMLAudioElement>(`#audio_${id}`)!;
  if (isInstrumentPlaying) {
    audio.volume = 1;

    umami?.track("add-instrument", { instrument: id });
  } else {
    audio.volume = 0;

    umami?.track("remove-instrument", { instrument: id });
  }

  // Stop playing if there are no more instruments enabled
  const selectedInstrumentCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[name=instrument]")
  ).filter((checkbox) => checkbox.checked);

  if (!isInstrumentPlaying && selectedInstrumentCheckboxes.length === 0) {
    setIsPlaying(false);
    setControlsEnabledState(false);
  }

  // Enable the controls if there is at least one instrument enabled and there's a song selected
  if (selectedInstrumentCheckboxes.length > 0 && currentSong !== "") {
    setControlsEnabledState(true);
  }
}

function cycleBigIcon() {
  const button = document.querySelector<HTMLAudioElement>("#big-icon")!;
  const currentIconIndex = BIG_ICONS.findIndex((name) =>
    button.classList.contains(`big-icon_${name}`)
  );

  if (currentIconIndex === -1) {
    return;
  }

  const currentIcon = BIG_ICONS[currentIconIndex];
  const nextIcon = BIG_ICONS[(currentIconIndex + 1) % BIG_ICONS.length];

  button.classList.remove(`big-icon_${currentIcon}`);
  button.classList.add(`big-icon_${nextIcon}`);

  umami?.track("change-icon", { icon: nextIcon });
}

function attachListeners() {
  const songButtons = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[name=song]")
  );
  const instrumentCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[name=instrument]")
  );
  const prevButton = document.querySelector("#controls-prev")!;
  const playButton = document.querySelector("#controls-play")!;
  const bigIcon = document.querySelector<HTMLAudioElement>("#big-icon")!;

  songButtons.forEach((button) =>
    button.addEventListener("change", (event) =>
      setSong((event.target as HTMLInputElement).value)
    )
  );
  instrumentCheckboxes.forEach((checkbox) =>
    checkbox.addEventListener("change", (event) =>
      setInstrumentPlaying(
        (event.target as HTMLInputElement).value,
        (event.target as HTMLInputElement).checked
      )
    )
  );

  playButton.addEventListener("click", () => setIsPlaying(!isPlaying));
  prevButton.addEventListener("click", () => skipBackToStart());
  bigIcon.addEventListener("click", () => cycleBigIcon());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachListeners);
} else {
  attachListeners();
}
