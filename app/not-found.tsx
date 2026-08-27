import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 px-4 text-center">
      <h2 className="text-2xl font-bold font-heading mb-2">Page Not Found</h2>
      <p className="text-slate-600 text-sm mb-4">Could not find requested resource</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
      >
        Return Home
      </Link>
    </div>
  );
}
