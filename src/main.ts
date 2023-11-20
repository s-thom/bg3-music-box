import "./style.css";

const INSTRUMENTS = ["voice", "flute", "violin", "lute", "lyre", "drum"];

// const songGroup = document.querySelector("fieldset[name=songs]")!;
const songButtons = Array.from(
  document.querySelectorAll<HTMLInputElement>("input[name=song]")
);
const instrumentGroup = document.querySelector("fieldset[name=instruments]")!;
const instrumentCheckboxes = Array.from(
  document.querySelectorAll<HTMLInputElement>("input[name=instrument]")
);

let audioElements: HTMLAudioElement[] = [];

async function setSong(id: string) {
  console.log("song", { id });

  const audioContainer = document.querySelector("#audio")!;
  document.querySelectorAll<HTMLAudioElement>("audio").forEach((audio) => {
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

  // Turn on the instruments that have their checkboxes selected already
  const selectedInstrumentCheckboxes = instrumentCheckboxes.filter(
    (checkbox) => checkbox.checked
  );
  selectedInstrumentCheckboxes.forEach((instrumentCheckbox) => {
    const audio = document.querySelector<HTMLAudioElement>(
      `#audio_${instrumentCheckbox.value}`
    )!;
    audio.volume = 1;
  });

  instrumentGroup.setAttribute("disabled", "");
  audioElements = await Promise.all(loadPromises);
  instrumentGroup.removeAttribute("disabled");

  // Start playing immediately if there are any instruments already selected
  if (selectedInstrumentCheckboxes.length > 0) {
    audioElements.forEach((audio) => audio.play());
  }
}

function setInstrumentPlaying(id: string, isPlaying: boolean) {
  console.log("toggleInstrument", { id, isPlaying });

  const audio = document.querySelector<HTMLAudioElement>(`#audio_${id}`)!;
  audio.volume = isPlaying ? 1 : 0;

  // Start playing if this is the only instrument and this has just been enabled
  const selectedInstrumentCheckboxes = instrumentCheckboxes.filter(
    (checkbox) => checkbox.checked
  );
  if (isPlaying && selectedInstrumentCheckboxes.length === 1) {
    audioElements.forEach((audio) => audio.play());
  }

  // Stop playing if there are no more instruments enabled
  if (!isPlaying && selectedInstrumentCheckboxes.length === 0) {
    audioElements.forEach((audio) => {
      audio.currentTime = -1;
      audio.pause();
    });
  }
}

function attachListeners() {
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
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachListeners);
} else {
  attachListeners();
}
