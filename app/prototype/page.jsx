export const metadata = { title: "FORM · Phase 0 prototype" };

export default function PrototypePage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#000" }}>
      <iframe
        title="FORM Phase 0 design prototype"
        src="/prototype/index.html"
        style={{ display: "block", width: "100%", height: "100dvh", border: 0 }}
      />
    </main>
  );
}
