import AddTransactionForm from "../../../components/add/AddTransactionForm";

export default function AddPage() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 md:pt-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">
          Add
        </h1>
        <p className="text-sm text-stone-600">
          Log a credit or debit in a few taps.
        </p>
      </header>
      <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-4 shadow-sm md:p-6">
        <AddTransactionForm />
      </div>
    </div>
  );
}
