import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
import test from "node:test";

class Element {
  children: Element[] = [];
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  attributes: Record<string, string> = {};
  listeners: Record<string, Function> = {};
  classes = new Set<string>();
  classList = {toggle: (key: string, enabled: boolean) => enabled ? this.classes.add(key) : this.classes.delete(key)};
  textContent = "";
  value = "all";
  hidden = false;
  append(...children: Element[]) {this.children.push(...children);}
  replaceChildren(...children: Element[]) {this.children = children;}
  setAttribute(key: string, value: string) {this.attributes[key] = value; if (key.startsWith("data-")) this.dataset[key.slice(5)] = value;}
  addEventListener(key: string, callback: Function) {this.listeners[key] = callback;}
  focus() {}
  querySelectorAll(selector: string): Element[] {
    const key = selector.slice(6, -1);
    return this.children.flatMap(child => [...(key in child.dataset ? [child] : []), ...child.querySelectorAll(selector)]);
  }
}

for (const language of ["en", "zh-CN"] as const) test(`offline ${language} architecture diagram has valid graphs and working handlers`, () => {
  const html = readFileSync(new URL(language === "en" ? "../docs/architecture-flow.html" : "../docs/architecture-flow.zh-CN.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/);
  const elements = new Map<string, Element>();
  const get = (id: string) => {if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id)!;};
  const tabs = [get("tab-architecture"), get("tab-business")];
  tabs.forEach((tab, i) => tab.dataset.view = i ? "business" : "architecture");
  const context = vm.createContext({document: {
    getElementById: get,
    createElement: () => new Element(), createElementNS: () => new Element(),
    querySelectorAll: (selector: string) => {assert.equal(selector, "[data-view]"); return tabs;},
  }});
  vm.runInContext(script, context, {timeout: 1000});
  const graphs = vm.runInContext("graphs", context);
  for (const [view, graph] of Object.entries(graphs) as [string, any][]) {
    const ids = new Set(graph.nodes.map((n: any) => n.id));
    assert.equal(ids.size, graph.nodes.length);
    for (const node of graph.nodes) {
      assert.ok(node.x >= 0 && node.x + node.w <= 1040 && node.y + node.h <= graph.height, node.id);
      for (const file of node.files) assert.ok(existsSync(fileURLToPath(new URL(`../${file}`, import.meta.url))), file);
    }
    for (const edge of graph.edges) assert.ok(ids.has(edge.from) && ids.has(edge.to));
    tabs[view === "architecture" ? 0 : 1].listeners.click();
    for (const button of get("canvas").querySelectorAll("[data-node]")) {
      button.listeners.click();
      assert.equal(button.attributes["aria-pressed"], "true");
      assert.ok(get("detail").children.length);
    }
  }
  const scenarios = vm.runInContext("scenarios", context);
  const nodeIds = new Set(graphs.business.nodes.map((n: any) => n.id));
  const edgeIds = new Set(graphs.business.edges.map((e: any) => `${e.from}>${e.to}`));
  for (const [name, scenario] of Object.entries(scenarios) as [string, any][]) {
    for (const id of scenario.nodes) assert.ok(nodeIds.has(id), id);
    for (const id of scenario.edges) assert.ok(edgeIds.has(id), id);
    get("scenario").value = name;
    get("scenario").listeners.change();
    assert.equal(get("scenario-note").hidden, name === "all");
  }
  assert.match(get("map-title").textContent, language === "en" ? /one generation/ : /单次生成/);
});
