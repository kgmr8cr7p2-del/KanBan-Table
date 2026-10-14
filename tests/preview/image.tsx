import type { ImgHTMLAttributes } from "react";
export default function PreviewImage({ priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) {
  void priority;
  // The preview serves local public assets directly, without Next's optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ""} />;
}
