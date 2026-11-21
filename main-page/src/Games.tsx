import { useState } from "react";

export const gameNames = [
  "Counting boxes",
  "Colouring game",
  "Find the differences",
  "Picture day",
] as const;
export type GameName = (typeof gameNames)[number];

export function GameCards({ onPlay }: { onPlay: (game: GameName) => void }) {
  return (
    <section className="metrics-grid game-cards" aria-label="Choose a game">
      {[
        {
          name: gameNames[0],
          note: "Count at your own pace",
          style: "calories-card",
          art: "boxes",
          tag: "01",
        },
        {
          name: gameNames[1],
          note: "Make something colourful",
          style: "water-card",
          art: "colours",
          tag: "02",
        },
        {
          name: gameNames[2],
          note: "A little attention to detail",
          style: "movement-card",
          art: "differences",
          tag: "03",
        },
        {
          name: gameNames[3],
          note: "Capture these objects",
          style: "sleep-card",
          art: "picture",
          tag: "04",
        },
      ].map((game, i) => (
        <button
          type="button"
          className={`metric-card game-card ${game.style}`}
          key={game.name}
          onClick={() => onPlay(gameNames[i])}
          aria-label={`Play ${game.name}`}
        >
          <span className="game-card-top">
            <span>{game.tag}</span>
          </span>
          <span className={`game-card-art ${game.art}`} aria-hidden="true">
            {game.art === "boxes" ? (
              Array.from({ length: 5 }, (_, n) => <i key={n} />)
            ) : game.art === "colours" ? (
              Array.from({ length: 4 }, (_, n) => <i key={n} />)
            ) : game.art === "differences" ? (
              <>
                <i />
                <i />
              </>
            ) : (
              <span className="picture-card-camera">
                <i />
              </span>
            )}
          </span>
          <strong>{game.name}</strong>
          <span className="game-card-note">{game.note}</span>
        </button>
      ))}
    </section>
  );
}

export function Game({ name }: { name: GameName }) {
  if (name === "Counting boxes") return <CountingBoxes />;
  if (name === "Colouring game") return <ColouringGame />;
  if (name === "Find the differences") return <Differences />;
  return <PictureDay />;
}

const picturePrompts = [
  "Something that makes you smile",
  "Your favourite colour",
  "Something soft or cosy",
];

function PictureDay() {
  const [pictures, setPictures] = useState<string[]>([]);
  const [message, setMessage] = useState("Your first picture is waiting.");
  const complete = pictures.length === picturePrompts.length;

  function addPicture(file?: File) {
    if (!file || complete) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      setPictures((current) => [...current, reader.result as string]);
      setMessage(
        pictures.length === picturePrompts.length - 1
          ? "Picture Day complete! What a lovely little collection."
          : "Lovely picture! Here comes your next prompt.",
      );
    });
    reader.readAsDataURL(file);
  }

  function removePicture(index: number) {
    setPictures((current) => current.filter((_, pictureIndex) => pictureIndex !== index));
    setMessage("That spot is ready for a new picture.");
  }

  return (
    <div className="picture-day-game">
      <p>Take three pictures inspired by the gentle prompts. Use your camera or choose a photo.</p>
      <div className="picture-prompt">
        <span>
          PICTURE {Math.min(pictures.length + 1, picturePrompts.length)} OF {picturePrompts.length}
        </span>
        <strong>
          {complete ? "Your Picture Day collection" : picturePrompts[pictures.length]}
        </strong>
      </div>
      <div className="picture-day-grid">
        {picturePrompts.map((prompt, index) => (
          <div className={`picture-slot ${pictures[index] ? "filled" : ""}`} key={prompt}>
            {pictures[index] ? (
              <>
                <img src={pictures[index]} alt={`${prompt} — picture ${index + 1}`} />
                <button
                  onClick={() => removePicture(index)}
                  aria-label={`Remove picture ${index + 1}`}
                >
                  ×
                </button>
              </>
            ) : (
              <>
                <span>{index + 1}</span>
                <small>{index === pictures.length ? "Next" : "Waiting"}</small>
              </>
            )}
          </div>
        ))}
      </div>
      {!complete && (
        <label className="picture-take-button">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              addPicture(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span className="picture-button-icon" aria-hidden="true">
            <i />
          </span>
          Take or choose a picture
        </label>
      )}
      <div className="game-feedback" role="status">
        {message}
      </div>
      {complete && (
        <button
          className="primary-button"
          onClick={() => {
            setPictures([]);
            setMessage("Your first picture is waiting.");
          }}
        >
          Start a new Picture Day →
        </button>
      )}
      <p className="picture-privacy">
        Pictures stay on this device and are cleared when you close the game.
      </p>
    </div>
  );
}

function CountingBoxes() {
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const target = [6, 4, 9, 7, 3, 10, 5, 8][round % 8];
  const options = [target - 1, target, target + 1, target + 2];
  const offset = round % 4;
  const correct = answer === target;
  return (
    <div className="counting-game">
      <p>How many boxes can you see? Take your time, then tap your answer.</p>
      <div className="counting-board" role="img" aria-label="Boxes to count">
        {Array.from({ length: target }, (_, i) => (
          <span className="counting-box" key={i} />
        ))}
      </div>
      <div className="answer-options" aria-label="Choose the number of boxes">
        {options.map((_, i) => {
          const value = options[(i + offset) % 4];
          return (
            <button
              key={value}
              disabled={correct}
              onClick={() => setAnswer(value)}
              className={answer === value ? (correct ? "correct" : "try-again") : ""}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="game-feedback" role="status">
        {answer === null
          ? "A little focus, one box at a time."
          : correct
            ? "That’s right! Nicely counted."
            : "Not quite. Have another little look."}
      </div>
      {correct && (
        <button
          className="primary-button"
          onClick={() => {
            setRound(round + 1);
            setAnswer(null);
          }}
        >
          Next round →
        </button>
      )}
    </div>
  );
}

const palette = [
  { name: "Sage green", value: "#9AB57E" },
  { name: "Sky blue", value: "#91C8DB" },
  { name: "Butter yellow", value: "#EED786" },
  { name: "Soft pink", value: "#DBA4AE" },
  { name: "Lavender", value: "#B5A3CC" },
  { name: "Peach", value: "#E8B58E" },
];

function ColouringGame() {
  const [colour, setColour] = useState(palette[0].value);
  const [fills, setFills] = useState<Record<string, string>>({});
  const [lastPart, setLastPart] = useState("");
  const shapes = [
    { id: "stem", label: "Stem", shape: <rect x="145" y="144" width="10" height="117" rx="5" /> },
    {
      id: "left-leaf",
      label: "Left leaf",
      shape: <path d="M148 226C90 231 65 198 70 176c46-4 73 13 78 50Z" />,
    },
    {
      id: "right-leaf",
      label: "Right leaf",
      shape: <path d="M153 206c4-42 33-58 75-48-1 33-30 55-75 48Z" />,
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `petal-${i}`,
      label: `Petal ${i + 1}`,
      shape: <ellipse cx="150" cy="66" rx="25" ry="37" transform={`rotate(${i * 60} 150 115)`} />,
    })),
    { id: "centre", label: "Flower centre", shape: <circle cx="150" cy="115" r="30" /> },
    { id: "pot", label: "Flower pot", shape: <path d="M109 251h82l-12 51h-58Z" /> },
  ];
  function paint(id: string, label: string) {
    setFills({ ...fills, [id]: colour });
    setLastPart(label);
  }
  return (
    <div className="colouring-game">
      <p>Pick a colour, then tap a part of the flower. There’s no wrong way to create.</p>
      <svg
        className="colouring-flower"
        viewBox="0 0 300 325"
        aria-label="Interactive flower colouring picture"
      >
        {shapes.map((part) => (
          <g
            key={part.id}
            role="button"
            tabIndex={0}
            aria-label={`Colour ${part.label.toLowerCase()}`}
            fill={fills[part.id] || "#FFFFFF"}
            stroke="#7B8D70"
            strokeWidth="2.5"
            strokeLinejoin="round"
            onClick={() => paint(part.id, part.label)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                paint(part.id, part.label);
              }
            }}
          >
            {part.shape}
          </g>
        ))}
      </svg>
      <div className="colour-palette" aria-label="Choose a colour">
        {palette.map((item) => (
          <button
            key={item.name}
            aria-label={item.name}
            aria-pressed={colour === item.value}
            onClick={() => setColour(item.value)}
            style={{ backgroundColor: item.value }}
            className={colour === item.value ? "selected" : ""}
          />
        ))}
      </div>
      <div className="game-feedback" role="status">
        {lastPart
          ? `${lastPart} coloured. Looking lovely!`
          : "A little colour can brighten your day."}
      </div>
      <button
        className="game-secondary"
        onClick={() => {
          setFills({});
          setLastPart("");
        }}
      >
        Start fresh
      </button>
    </div>
  );
}

function Shape({ kind, colour }: { kind: number; colour: string }) {
  return (
    <svg viewBox="0 0 60 60" width="44" height="44" aria-hidden="true" fill={colour}>
      {kind === 0 ? (
        <circle cx="30" cy="30" r="18" />
      ) : kind === 1 ? (
        <rect x="12" y="12" width="36" height="36" rx="6" />
      ) : kind === 2 ? (
        <path d="m30 9 23 40H7Z" />
      ) : (
        <path d="m30 7 7 15 17 2-13 12 4 17-15-9-15 9 4-17L6 24l17-2Z" />
      )}
    </svg>
  );
}

function Differences() {
  const [found, setFound] = useState<number[]>([]);
  const [message, setMessage] = useState("Look for three changes in the second picture.");
  const [round, setRound] = useState(0);
  const changes = round % 2 === 0 ? [1, 3, 5] : [0, 2, 4];
  const complete = found.length === changes.length;
  function choose(index: number) {
    if (found.includes(index) || complete) return;
    if (changes.includes(index)) {
      setFound([...found, index]);
      setMessage(
        found.length === 2
          ? "You found all three! Brilliant spotting."
          : "You spotted one! Keep looking.",
      );
    } else setMessage("Those two match. Try another shape.");
  }
  return (
    <div className="differences-game">
      <p>
        Compare the two pictures. Tap the three shapes that are different in the second picture.
      </p>
      <div className="difference-picture">
        <span>THE ORIGINAL</span>
        <div className="difference-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="difference-cell" key={i}>
              <Shape kind={(i + round) % 4} colour={palette[i].value} />
            </div>
          ))}
        </div>
      </div>
      <div className="difference-picture">
        <span>FIND THE CHANGES</span>
        <div className="difference-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <button
              className={`difference-cell ${found.includes(i) ? "found" : ""}`}
              key={i}
              aria-label={`Check shape ${i + 1}`}
              aria-pressed={found.includes(i)}
              onClick={() => choose(i)}
            >
              <Shape
                kind={(i + round + (changes.includes(i) ? 1 : 0)) % 4}
                colour={palette[i].value}
              />
              {found.includes(i) && (
                <span className="found-tick" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="difference-progress">{found.length} of 3 differences found</div>
      <div className="game-feedback" role="status">
        {message}
      </div>
      {complete && (
        <button
          className="primary-button"
          onClick={() => {
            setRound(round + 1);
            setFound([]);
            setMessage("A fresh picture. Can you find all three?");
          }}
        >
          Play again →
        </button>
      )}
    </div>
  );
}
