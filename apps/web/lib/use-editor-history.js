import { useRef, useState } from "react";

export function useEditorHistory(initialValue, limit = 80) {
  const [value, setValue] = useState(initialValue);
  const valueRef = useRef(initialValue);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, setRevision] = useState(0);

  function show(next) {
    valueRef.current = next;
    setValue(next);
    setRevision((current) => current + 1);
  }

  function commit(update) {
    const current = valueRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (next === current) return;
    pastRef.current = [...pastRef.current.slice(-(limit - 1)), current];
    futureRef.current = [];
    show(next);
  }

  function replace(update) {
    const current = valueRef.current;
    const next = typeof update === "function" ? update(current) : update;
    if (next !== current) show(next);
  }

  function checkpoint(previous) {
    if (!previous || previous === valueRef.current) return;
    pastRef.current = [...pastRef.current.slice(-(limit - 1)), previous];
    futureRef.current = [];
    setRevision((current) => current + 1);
  }

  function undo() {
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [valueRef.current, ...futureRef.current];
    show(previous);
  }

  function redo() {
    const next = futureRef.current[0];
    if (!next) return;
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, valueRef.current];
    show(next);
  }

  function reset(next) {
    pastRef.current = [];
    futureRef.current = [];
    show(next);
  }

  return { value, commit, replace, checkpoint, reset, undo, redo, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 };
}
