export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page has its own layout — no sidebar/topbar
  return <>{children}</>;
}
