import { useState } from "react";
import { loadHistory } from "../storage";

interface Props {
  onStart: (maxPoints: number, playerNames: string[]) => void;
  onViewHistory: () => void;
}

function getInitialPlayers(): string[] {
  const history = loadHistory();
  if (history.length === 0) return ["", ""];
  return history[0].state.players.map((p) => p.name);
}

function getSuggestions(currentPlayers: string[]): string[] {
  const history = loadHistory();
  const current = new Set(
    currentPlayers.map((p) => p.trim().toLowerCase()).filter(Boolean),
  );
  const seen = new Set<string>();
  const suggestions: string[] = [];

  // Skip the most recent game (already used as defaults), scan the rest
  for (const game of history.slice(1)) {
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

export default function SetupScreen({ onStart, onViewHistory }: Props) {
  const [maxPoints, setMaxPoints] = useState(100);
  const [players, setPlayers] = useState<string[]>(getInitialPlayers);

  const suggestions = getSuggestions(players);

  function addPlayer() {
    if (players.length < 8) setPlayers([...players, ""]);
  }

  function removePlayer(i: number) {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, idx) => idx !== i));
  }

  function updatePlayer(i: number, val: string) {
    const next = [...players];
    next[i] = val;
    setPlayers(next);
  }

  function addSuggestion(name: string) {
    if (players.length >= 8) return;
    // Fill the first empty slot, or append
    const emptyIdx = players.findIndex((p) => p.trim() === "");
    if (emptyIdx !== -1) {
      const next = [...players];
      next[emptyIdx] = name;
      setPlayers(next);
    } else {
      setPlayers([...players, name]);
    }
  }

  const filledNames = players.map((p) => p.trim()).filter(Boolean);
  const canStart = filledNames.length >= 2 && maxPoints >= 10;

  function handleStart() {
    if (!canStart) return;
    onStart(maxPoints, filledNames);
  }

  function handleKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key === "Enter" && i === players.length - 1) addPlayer();
  }

  return (
    <div className="container">
      <div className="setup-header">
        <h1>SAULIN Yaniv</h1>
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
        <h2>Players ({players.length} / 8)</h2>
        <div className="player-list">
          {players.map((name, i) => (
            <div key={i} className="player-row">
              <input
                type="text"
                placeholder={`Player ${i + 1}`}
                value={name}
                onChange={(e) => updatePlayer(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                autoFocus={i === 0}
              />
              {players.length > 2 && (
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

        {players.length < 8 && (
          <button className="btn-secondary mt-2" onClick={addPlayer}>
            + Add player
          </button>
        )}

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
