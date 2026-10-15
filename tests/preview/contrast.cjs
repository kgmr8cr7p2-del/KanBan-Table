async function contrastIssues(page, selector = 'button, .button, summary, .report-kpi, .board-view-tabs a, .reports-period-actions a') {
  return page.evaluate(selector => {
    const rgb = value => {
      const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
      const scale = /^color\(srgb/.test(value) ? 255 : 1;
      return numbers.length >= 3 ? [...numbers.slice(0, 3).map(channel => channel * scale), numbers[3] ?? 1] : [0, 0, 0, 0];
    };
    const over = (front, back) => [...front.slice(0, 3).map((channel, index) => channel * front[3] + back[index] * (1 - front[3])), 1];
    const luminance = color => color.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
    const issues = [];
    const visited = new Set();
    for (const root of document.querySelectorAll(selector)) {
      if (root.matches(':disabled,[aria-disabled="true"]') || root.closest('[inert]')) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode.textContent.trim();
        const node = walker.currentNode.parentElement;
        if (!text || visited.has(node) || !node.getClientRects().length) continue;
        visited.add(node);
        const style = getComputedStyle(node);
        if (style.visibility !== 'visible') continue;
        const chain = [];
        for (let parent = node; parent; parent = parent.parentElement) chain.push(parent);
        let background = [255, 255, 255, 1];
        for (const ancestor of chain.reverse()) background = over(rgb(getComputedStyle(ancestor).backgroundColor), background);
        const foreground = over(rgb(style.color), background);
        const a = luminance(foreground), b = luminance(background);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && parseInt(style.fontWeight) >= 700);
        if (ratio + 0.01 < (large ? 3 : 4.5)) issues.push({text: text.slice(0, 70),className:node.className,root:root.className,ratio:+ratio.toFixed(2),color:style.color,background:background.slice(0,3).map(Math.round)});
      }
    }
    return issues;
  }, selector);
}
module.exports = { contrastIssues };
