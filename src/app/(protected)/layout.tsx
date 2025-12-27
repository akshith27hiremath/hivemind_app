export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout - individual pages define their own visual structure
  // Auth is handled by middleware.ts
  return <>{children}</>;
}
