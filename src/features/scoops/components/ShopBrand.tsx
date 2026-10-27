/** Wallpaper only. Sits behind the shop and never receives clicks. */

const MARKS: { icon: string; top: string; left: string; rotate: number }[] = [
  { icon: "🍦", top: "7%", left: "3%", rotate: -16 },
  { icon: "🍨", top: "9%", left: "68%", rotate: 11 },
  { icon: "🍒", top: "38%", left: "1%", rotate: -8 },
  { icon: "🍦", top: "42%", left: "78%", rotate: 14 },
  { icon: "🧁", top: "68%", left: "6%", rotate: 8 },
  { icon: "🍨", top: "72%", left: "62%", rotate: -12 },
  { icon: "🍦", top: "88%", left: "28%", rotate: -6 },
  { icon: "🍒", top: "22%", left: "42%", rotate: 6 },
];

export function ShopBrand() {
  return (
    <div className="shop-brand" aria-hidden="true">
      {MARKS.map((mark) => (
        <p
          key={`${mark.top}-${mark.left}`}
          className="brand-mark"
          style={{ top: mark.top, left: mark.left, transform: `rotate(${mark.rotate}deg)` }}
        >
          <span className="brand-icon">{mark.icon}</span>
          Shelby&apos;s Scoops
        </p>
      ))}
    </div>
  );
}
