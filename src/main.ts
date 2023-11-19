import "./style.css";

const INSTRUMENTS = ["voice", "flute", "violin", "lute", "lyre", "drum"];

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
    // @ts-ignore: resolve is set in the Promise constructor
    audio.addEventListener("canplay", () => resolve(audio));
    // @ts-ignore: resolve is set in the Promise constructor
    audio.addEventListener("canplaythrough", () => resolve(audio));
    // @ts-ignore: reject is set in the Promise constructor
    audio.addEventListener("error", reject);

    audioContainer.appendChild(audio);

    return promise;
  });

  const audioElements = await Promise.all(loadPromises);
  audioElements.forEach((audio) => audio.play());
}

function toggleInstrument(event: Event) {
  console.log("toggleInstrument", { value: (event.target as any)?.value });
}

function attachListeners() {
  document
    .querySelectorAll<HTMLInputElement>("input[name=song]")
    .forEach((songInput) =>
      songInput.addEventListener("change", (event) =>
        setSong((event.target as HTMLInputElement).value)
      )
    );
  document
    .querySelectorAll<HTMLInputElement>("input[name=instrument]")
    .forEach((instrumentInput) =>
      instrumentInput.addEventListener("change", toggleInstrument)
    );
}

attachListeners();
