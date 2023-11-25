import "./style.css";

const SONGS = [
  "the-power",
  "old-time-battles",
  "bard-dance",
  "of-divinity-and-sin",
  "sing-for-me",
  "the-queens-high-seas",
] as const;
type Song = (typeof SONGS)[number];

const INSTRUMENTS = [
  "voice",
  "flute",
  "violin",
  "lute",
  "lyre",
  "drum",
] as const;
type Instrument = (typeof INSTRUMENTS)[number];

const BIG_ICONS = [
  "bardic-inspiration",
  "restore-bardic-inspiration",
  "song-of-rest",
  "toss-a-coin",
] as const;

interface StoredSettings {
  bigIcon: (typeof BIG_ICONS)[number];
  selectedSong: Song | "";
  selectedInstruments: (typeof INSTRUMENTS)[number][];
}

const LOCAL_STORAGE_KEY = "bard-settings";

let isPlaying = false;
let selectedSong: Song | "" = "";

function formatTime(numSeconds: number) {
  const minutes = Math.floor(numSeconds / 60);
  const seconds = Math.floor(numSeconds % 60);
  const secondsString = seconds.toString().padStart(2, "0");

  return `${minutes}:${secondsString}`;
}

function getAllAudio() {
  return Array.from(
    document
      .querySelector("#audio")!
      .querySelectorAll<HTMLAudioElement>("audio")
  );
}

function getInstrumentCheckboxes() {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>("input[name=instrument]")
  );
}

// #region Settings
function getStoredSettings(): StoredSettings | undefined {
  const str = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!str) {
    return undefined;
  }

  try {
    const value = JSON.parse(str);
    return value;
  } catch (err) {
    return undefined;
  }
}

function storeSettings(value: StoredSettings): void {
  const str = JSON.stringify(value);
  localStorage.setItem(LOCAL_STORAGE_KEY, str);
}

function updateSetting<K extends keyof StoredSettings>(
  key: K,
  value: StoredSettings[K]
) {
  let currentSettings = getStoredSettings();
  if (!currentSettings) {
    // There's nothing saved in state yet, so we need to get the current state and store that first

    const bigIconButton =
      document.querySelector<HTMLAudioElement>("#big-icon")!;
    const bigIcon = BIG_ICONS.find((name) =>
      bigIconButton.classList.contains(`big-icon_${name}`)
    );

    const selectedInstruments = getInstrumentCheckboxes().reduce<Instrument[]>(
      (arr, curr) => {
        if (curr.checked) {
          arr.push(curr.value as Instrument);
        }
        return arr;
      },
      []
    );

    currentSettings = {
      bigIcon: bigIcon ?? BIG_ICONS[0],
      selectedSong,
      selectedInstruments,
    };
  }

  storeSettings({
    ...currentSettings,
    [key]: value,
  });
}
// #endregion

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
      umami?.track("play", { song: selectedSong });
    }
  } else {
    playButton.classList.remove("control-pause");
    playButton.classList.add("control-play");

    if (shouldTrack && previousIsPlaying) {
      umami?.track("pause", { song: selectedSong });
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
  umami?.track("skip-back", { song: selectedSong });

  if (isPlaying) {
    setIsPlaying(false, false);
  }

  getAllAudio().forEach((audio) => {
    audio.currentTime = 0;
  });
}

async function setSong(id: Song) {
  umami?.track("change-song", { song: id });
  setIsPlaying(false);
  selectedSong = id;

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
  const newAudio = await Promise.all(loadPromises);
  const firstAudio = newAudio[0]!;

  // Don't proceed if user switched to another song during loading
  if (selectedSong !== id) {
    return;
  }

  // Turn on the instruments that have their checkboxes selected already
  const selectedInstrumentCheckboxes = getInstrumentCheckboxes().filter(
    (checkbox) => checkbox.checked
  );
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

  // Set up time display
  const progressMeter = document.querySelector("#progress-meter")!;
  const time1 = document.querySelector("#progress-text-1")!;
  const time2 = document.querySelector("#progress-text-2")!;

  const startText = formatTime(0);
  const fullLengthText = formatTime(firstAudio.duration);

  progressMeter.setAttribute("aria-valuenow", "0");
  progressMeter.setAttribute("aria-valuemax", firstAudio.duration.toString());
  progressMeter.setAttribute(
    "aria-valuetext",
    `${startText} / ${fullLengthText}`
  );

  time1.textContent = startText;
  time2.textContent = fullLengthText;

  // Set up progress tracking
  const progressBackground = document.querySelector<HTMLMeterElement>(
    "#controls-progress-fill"
  )!;
  const duration = Math.ceil(firstAudio.duration);
  firstAudio.addEventListener("timeupdate", () => {
    const durationText = formatTime(firstAudio.currentTime);

    time1.textContent = durationText;
    progressMeter.setAttribute(
      "aria-valuenow",
      firstAudio.currentTime.toString()
    );
    progressMeter.setAttribute(
      "aria-valuetext",
      `${durationText} / ${fullLengthText}`
    );

    const durationPercent = (firstAudio.currentTime / duration) * 100;
    progressBackground.style.setProperty(
      "--fill-percent",
      durationPercent.toString()
    );
  });

  updateSetting("selectedSong", selectedSong);
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
  const selectedInstrumentCheckboxes = getInstrumentCheckboxes().filter(
    (checkbox) => checkbox.checked
  );

  if (!isInstrumentPlaying && selectedInstrumentCheckboxes.length === 0) {
    setIsPlaying(false);
    setControlsEnabledState(false);
  }

  // Enable the controls if there is at least one instrument enabled and there's a song selected
  if (selectedInstrumentCheckboxes.length > 0 && selectedSong !== "") {
    setControlsEnabledState(true);
  }

  updateSetting(
    "selectedInstruments",
    selectedInstrumentCheckboxes.map((checkbox) => checkbox.value as Instrument)
  );
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

  updateSetting("bigIcon", nextIcon);
  umami?.track("change-icon", { icon: nextIcon });
}

function setup() {
  const songButtons = Array.from(
    document.querySelectorAll<HTMLInputElement>("input[name=song]")
  );
  const instrumentCheckboxes = getInstrumentCheckboxes();
  const prevButton = document.querySelector("#controls-prev")!;
  const playButton = document.querySelector("#controls-play")!;
  const bigIcon = document.querySelector<HTMLAudioElement>("#big-icon")!;

  songButtons.forEach((button) =>
    button.addEventListener("change", (event) =>
      setSong((event.target as HTMLInputElement).value as Song)
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

  // Restore any saved settings
  const initialSettings = getStoredSettings();
  if (initialSettings) {
    bigIcon.classList.remove(...BIG_ICONS.map((name) => `big-icon_${name}`));
    bigIcon.classList.add(`big-icon_${initialSettings.bigIcon}`);

    if (initialSettings.selectedSong !== "") {
      songButtons.forEach((button) => {
        if ((button.value as Song) === initialSettings.selectedSong) {
          button.checked = true;
          setSong(initialSettings.selectedSong);
        }
      });
    }

    instrumentCheckboxes.forEach((checkbox) => {
      if (
        initialSettings.selectedInstruments.includes(
          checkbox.value as Instrument
        )
      ) {
        checkbox.checked = true;
        setInstrumentPlaying(checkbox.value, true);
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup();
}
