import test from "node:test";
import assert from "node:assert/strict";
import { MASCOT_FOOT_Y, planMascotMotion } from "../src/lib/mascot-motion";

test("mascot lands with its feet on the selected control", () => {
  const plan = planMascotMotion({ x: 20, y: 400 }, { width: 1000, height: 800 }, [{ x: 400, y: 300, width: 100 }], 1, () => 0.5);
  assert.equal(plan.kind, "jump");
  assert.equal(plan.target.y + MASCOT_FOOT_Y, 300);
  assert.equal(plan.target.x + 56, 450);
  assert.equal(plan.keyframes.length, 13);
  assert.equal(plan.keyframes.at(-1)?.transform, "translate(394px,175px)");
  assert.notEqual(plan.keyframes[6].transform, "translate(207px,283px)");
});
test("mascot leaves completely and returns into the viewport", () => {
  const viewport = { width: 390, height: 844 };
  const exit = planMascotMotion({ x: 250, y: 400 }, viewport, [], 4);
  assert.equal(exit.kind, "exit");
  assert.ok(exit.target.x > viewport.width);
  const back = planMascotMotion(exit.target, viewport, [], 5);
  assert.equal(back.kind, "return");
  assert.ok(back.target.x >= 0 && back.target.x + 120 <= viewport.width);
});
test("motion remains bounded on narrow and short screens without platforms", () => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
    const plan = planMascotMotion({ x: 8, y: 8 }, viewport, [], 3, () => 0.999);
    assert.ok(plan.target.x + 120 <= viewport.width);
    assert.ok(plan.target.y + 160 <= viewport.height);
    assert.ok(plan.duration <= 3500);
  }
});
