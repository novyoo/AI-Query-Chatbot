import DatabaseList from '../components/DatabaseList';

export default function DatabasesView() {
  return (
    <div className="flex-1 px-10 py-8 max-w-6xl mx-auto w-full">
      <h2 className="font-[var(--font-display)] text-4xl font-bold text-[var(--color-burgundy)] mb-7">Your databases</h2>
      <DatabaseList viewPrefix="table" />
    </div>
  );
}
