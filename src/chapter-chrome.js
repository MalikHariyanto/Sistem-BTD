// Freeze only the outgoing controls, with their resolved colors. The live
// controls can adopt the new chapter immediately and share the scene's dissolve.
export function captureChapterChrome(elements) {
  return elements.flatMap((element) => {
    if (element.hidden) return [];
    const box = element.getBoundingClientRect();
    const copy = element.cloneNode(true);
    const originals = [element, ...element.querySelectorAll("*")];
    const copies = [copy, ...copy.querySelectorAll("*")];
    originals.forEach((original, i) => {
      const style = getComputedStyle(original);
      copies[i].removeAttribute("id");
      copies[i].removeAttribute("data-chapter");
      for (const property of ["color", "backgroundColor", "borderColor", "opacity"])
        copies[i].style[property] = style[property];
      copies[i].style.transition = "none";
    });
    copy.inert = true;
    copy.setAttribute("aria-hidden", "true");
    copy.dataset.chromeSnapshot = "";
    Object.assign(copy.style, {
      position: "fixed", inset: "auto", margin: "0",
      left: `${box.left}px`, top: `${box.top}px`,
      width: `${box.width}px`, height: `${box.height}px`,
      zIndex: "20", pointerEvents: "none",
    });
    document.body.append(copy);
    return [copy];
  });
}
