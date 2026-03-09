import { useState } from "react";
import { loadHistory } from "../storage";

interface Props {
  onStart: (maxPoints: number, playerNames: string[]) => void;
  onViewHistory: () => void;
}

/** Always keep exactly one trailing empty slot (unless at max 8). */
function withTrailingEmpty(arr: string[]): string[] {
  // Collapse multiple trailing empties into one
  let end = arr.length;
  while (end > 1 && arr[end - 1].trim() === "" && arr[end - 2].trim() === "") {
    end--;
  }
  const result = arr.slice(0, end);
  // Add trailing empty if last slot is filled and under max
  if (result.length < 8 && result[result.length - 1]?.trim() !== "") {
    result.push("");
  }
  return result;
}

function getInitialPlayers(): string[] {
  const history = loadHistory();
  const base =
    history.length === 0
      ? ["", ""]
      : history[0].state.players.map((p) => p.name);
  return withTrailingEmpty(base);
}

function getSuggestions(currentPlayers: string[]): string[] {
  const history = loadHistory();
  const current = new Set(
    currentPlayers.map((p) => p.trim().toLowerCase()).filter(Boolean),
  );
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const game of history) {
    for (const player of game.state.players) {
      const key = player.name.trim().toLowerCase();
      if (!current.has(key) && !seen.has(key)) {
        seen.add(key);
        suggestions.push(player.name);
        if (suggestions.length >= 10) return suggestions;
      }
    }
  }
  return suggestions;
}

function focusInput(idx: number) {
  const inputs = document.querySelectorAll<HTMLInputElement>(".player-input");
  inputs[idx]?.focus();
}

export default function SetupScreen({ onStart, onViewHistory }: Props) {
  const [maxPoints, setMaxPoints] = useState(100);
  const [players, setPlayers] = useState<string[]>(getInitialPlayers);

  const suggestions = getSuggestions(players);
  const filledNames = players.map((p) => p.trim()).filter(Boolean);
  const canStart = filledNames.length >= 2 && maxPoints >= 10;

  function setAndNormalize(next: string[]) {
    setPlayers(withTrailingEmpty(next));
  }

  function updatePlayer(i: number, val: string) {
    const next = [...players];
    next[i] = val;
    setAndNormalize(next);
  }

  function removePlayer(i: number) {
    const next = players.filter((_, idx) => idx !== i);
    // Keep at least 2 fields
    while (next.length < 2) next.push("");
    setAndNormalize(next);
  }

  function addSuggestion(name: string) {
    if (players.length >= 8) return;
    const emptyIdx = players.findIndex((p) => p.trim() === "");
    const next = [...players];
    if (emptyIdx !== -1) {
      next[emptyIdx] = name;
    } else {
      next.push(name);
    }
    setAndNormalize(next);
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      focusInput(i + 1);
    }
  }

  function handleStart() {
    if (!canStart) return;
    onStart(maxPoints, filledNames);
  }

  return (
    <div className="container">
      <div className="setup-header">
        <h1>MAGNUS' Yaniv</h1>
        <p className="subtitle">Score Tracker</p>
      </div>

      <div className="card">
        <h2>Game Settings</h2>
        <div className="field">
          <label htmlFor="max-points">Max points (elimination threshold)</label>
          <input
            id="max-points"
            type="number"
            min={10}
            max={1000}
            value={maxPoints}
            onChange={(e) => setMaxPoints(Number(e.target.value))}
          />
          {maxPoints >= 10 && (
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              Halving at every multiple of 50 &nbsp;&middot;&nbsp; Eliminated at
              ≥ {maxPoints} pts
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Players ({filledNames.length} / 8)</h2>
        <div className="player-list">
          {players.map((name, i) => (
            <div key={i} className="player-row">
              <input
                className="player-input"
                type="text"
                placeholder={
                  i === players.length - 1 ? "Add player…" : `Player ${i + 1}`
                }
                value={name}
                onChange={(e) => updatePlayer(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                autoFocus={i === 0}
              />
              {players.length > 2 && name.trim() !== "" && (
                <button
                  className="btn-danger"
                  onClick={() => removePlayer(i)}
                  aria-label="Remove player"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {suggestions.length > 0 && players.length < 8 && (
          <div className="suggestions-wrap">
            <span className="suggestions-label">Recent players</span>
            <div className="suggestions-list">
              {suggestions.map((name) => (
                <button
                  key={name}
                  className="suggestion-btn"
                  onClick={() => addSuggestion(name)}
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="setup-footer" style={{ gap: 12 }}>
        <button
          className="btn-secondary"
          onClick={onViewHistory}
          style={{ padding: "12px 24px" }}
        >
          Past games
        </button>
        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={!canStart}
          style={{ padding: "12px 40px", fontSize: "1rem" }}
        >
          Start game
        </button>
      </div>
    </div>
  );
}
