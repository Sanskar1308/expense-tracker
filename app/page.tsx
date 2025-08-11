'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Types based on your Prisma schema
type CategoryType = 'FOOD' | 'TRANSPORT' | 'UTILITIES' | 'ENTERTAINMENT' | 'OTHER';

interface Expense {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
  category: CategoryType;
}

interface CategoryTotal {
  category: CategoryType;
  total: number;
  count: number;
}

// Add Expense Component
const AddExpense = ({ onExpenseAdded }: { onExpenseAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'OTHER' as CategoryType
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: { value: CategoryType; label: string; color: string }[] = [
    { value: 'FOOD', label: 'Food', color: 'bg-orange-100 text-orange-800' },
    { value: 'TRANSPORT', label: 'Transport', color: 'bg-blue-100 text-blue-800' },
    { value: 'UTILITIES', label: 'Utilities', color: 'bg-green-100 text-green-800' },
    { value: 'ENTERTAINMENT', label: 'Entertainment', color: 'bg-purple-100 text-purple-800' },
    { value: 'OTHER', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  // Common expense titles mapped to categories
  const commonTitleToCategory: Record<string, CategoryType> = {
    'Snacks': 'FOOD',
    'Breakfast': 'FOOD',
    'Groceries': 'FOOD',
    'OTT': 'ENTERTAINMENT',
    'Dinner': 'FOOD',
    'Lunch': 'FOOD',
    'Petrol': 'TRANSPORT',
    'Shopping': 'OTHER',
  };

  const commonTitles = ['Snacks', 'Breakfast', 'Groceries', 'OTT', 'Dinner', 'Lunch', 'Petrol', 'Shopping'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount),
          category: formData.category
        }),
      });

      if (response.ok) {
        setFormData({ title: '', amount: '', category: 'OTHER' });
        setIsOpen(false);
        onExpenseAdded();
      } else {
        console.error('Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommonTitleClick = (title: string) => {
    // Auto-fill the title and category based on selected common title
    setFormData({
      ...formData,
      title,
      category: commonTitleToCategory[title] || 'OTHER',
    });
  };

  const handleCategoryClick = (category: CategoryType) => {
    setFormData({ ...formData, category });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Add New Expense</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-lg">➕</span>
          Add Expense
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter expense title"
              required
            />
            <div className="mt-2 flex justify-start space-x-2 overflow-x-auto pb-2">
              {commonTitles.map((title) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleCommonTitleClick(title)}
                  className="bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-full px-4 py-2 text-sm transition-colors whitespace-nowrap"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex space-x-2 mt-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => handleCategoryClick(category.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${category.color} ${formData.category === category.value ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};


// Recent Expenses Component
const RecentExpenses = ({ expenses, onRefresh }: { expenses: Expense[]; onRefresh: () => void }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryColor = (category: CategoryType) => {
    const colors = {
      FOOD: 'bg-orange-100 text-orange-800',
      TRANSPORT: 'bg-blue-100 text-blue-800',
      UTILITIES: 'bg-green-100 text-green-800',
      ENTERTAINMENT: 'bg-purple-100 text-purple-800',
      OTHER: 'bg-gray-100 text-gray-800'
    };
    return colors[category];
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Expenses</h2>
        <button
          onClick={onRefresh}
          className="text-blue-500 hover:text-blue-600 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No expenses yet. Add your first expense!</p>
        ) : (
          expenses.slice(0, 5).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-800">{expense.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                    {expense.category}
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <span className="text-xs">📅</span>
                  {formatDate(expense.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">Rs{expense.amount.toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {expenses.length > 5 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing 5 of {expenses.length} expenses
          </p>
        </div>
      )}
    </div>
  );
};

// Category Totals Component
const CategoryTotals = ({ categoryTotals }: { categoryTotals: CategoryTotal[] }) => {
  const getCategoryIcon = (category: CategoryType) => {
    const icons = {
      FOOD: '🍽️',
      TRANSPORT: '🚗',
      UTILITIES: '💡',
      ENTERTAINMENT: '🎬',
      OTHER: '📦'
    };
    return icons[category];
  };

  const getCategoryColor = (category: CategoryType) => {
    const colors = {
      FOOD: 'border-orange-200 bg-orange-50',
      TRANSPORT: 'border-blue-200 bg-blue-50',
      UTILITIES: 'border-green-200 bg-green-50',
      ENTERTAINMENT: 'border-purple-200 bg-purple-50',
      OTHER: 'border-gray-200 bg-gray-50'
    };
    return colors[category];
  };

  const totalAmount = categoryTotals.reduce((sum, category) => sum + category.total, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Category Totals</h2>
      
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <span className="text-sm font-medium text-blue-800">Total Spending</span>
        </div>
        <p className="text-2xl font-bold text-blue-900">Rs{totalAmount.toFixed(2)}</p>
      </div>

      <div className="grid gap-3">
        {categoryTotals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No expenses to categorize yet.</p>
        ) : (
          categoryTotals.map((category) => (
            <div key={category.category} className={`p-4 rounded-lg border-2 ${getCategoryColor(category.category)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(category.category)}</span>
                  <div>
                    <h3 className="font-medium text-gray-800">{category.category}</h3>
                    <p className="text-sm text-gray-600">{category.count} expense{category.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">Rs{category.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {totalAmount > 0 ? ((category.total / totalAmount) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Helper function to filter by date range
const filterExpensesByDate = (expenses: Expense[], startDate: Date, endDate: Date) => {
  return expenses.filter(expense => {
    const expenseDate = new Date(expense.createdAt);
    return expenseDate >= startDate && expenseDate <= endDate;
  });
};

// Main Dashboard Component
const Dashboard = () => {
  const { data: session, status } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [resetCategory, setResetCategory] = useState<CategoryType | 'ALL'>('ALL');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resetInfo, setResetInfo] = useState({ dateRange: '', category: '' });

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        let filteredExpenses = data;

        // Apply the selected filter
        const currentDate = new Date();
        if (filter === 'WEEK') {
          // Filter expenses for the current week
          const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
          const endOfWeek = new Date(currentDate.setDate(currentDate.getDate() + 6));
          filteredExpenses = filterExpensesByDate(filteredExpenses, startOfWeek, endOfWeek);
        } else if (filter === 'MONTH') {
          // Filter expenses for the current month
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          filteredExpenses = filterExpensesByDate(filteredExpenses, startOfMonth, endOfMonth);
        } else if (filter === 'CUSTOM' && customStartDate && customEndDate) {
          // Filter expenses for a custom date range
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          filteredExpenses = filterExpensesByDate(filteredExpenses, startDate, endDate);
        }

        setExpenses(filteredExpenses);

        // Calculate category totals
        const totals = filteredExpenses.reduce((acc: Record<CategoryType, { total: number; count: number }>, expense: Expense) => {
          if (!acc[expense.category]) {
            acc[expense.category] = { total: 0, count: 0 };
          }
          acc[expense.category].total += expense.amount;
          acc[expense.category].count += 1;
          return acc;
        }, {} as Record<CategoryType, { total: number; count: number }>);

        const categoryTotalsArray = Object.entries(totals as Record<CategoryType, { total: number; count: number }>).map(([category, data]) => ({
          category: category as CategoryType,
          total: data.total,
          count: data.count
        }));

        setCategoryTotals(categoryTotalsArray.sort((a, b) => b.total - a.total));
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchExpenses();
    } else if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [session, status, filter, customStartDate, customEndDate]);

  const handleFilterChange = (selectedFilter: 'ALL' | 'WEEK' | 'MONTH' | 'CUSTOM') => {
    setFilter(selectedFilter);
    if (selectedFilter !== 'CUSTOM') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };
  
  const openResetModal = () => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const currentDate = new Date();
  
    if (filter === 'WEEK') {
      startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (filter === 'MONTH') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (filter === 'CUSTOM' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }
  
    const dateRangeText = startDate && endDate
      ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
      : 'All Time';
    const categoryText = resetCategory === 'ALL' ? 'All Categories' : resetCategory;
  
    setResetInfo({ dateRange: dateRangeText, category: categoryText });
    setShowConfirmModal(true);
  };

  const confirmReset = async () => {
    let startDate: string | null = null;
    let endDate: string | null = null;
  
    if (filter === "WEEK") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } 
    else if (filter === "MONTH") {
      const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      startDate = start.toISOString();
      endDate = end.toISOString();
    } 
    else if (filter === "CUSTOM" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        startDate = start.toISOString();
        endDate = end.toISOString();
      }
    }
  
    try {
      const res = await fetch("/api/expenses/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          category: resetCategory === "ALL" ? null : resetCategory
        }),
      });
  
      if (res.ok) {
        const result = await res.json();
        console.log(`${result.deletedCount} expenses deleted`);
        setShowConfirmModal(false);
        fetchExpenses();
      } else {
        console.error("Failed to delete expenses");
      }
    } catch (err) {
      console.error("Error deleting expenses:", err);
    }
  };  

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to Expense Tracker</h2>
          <p className="text-gray-600 mb-4">Please sign in to access your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {session.user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 mt-2">
            Track your expenses and manage your budget effectively
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6">
          <div className="flex gap-4">
            <button onClick={() => handleFilterChange('ALL')} className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg">
              All Time
            </button>
            <button onClick={() => handleFilterChange('WEEK')} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg">
              This Week
            </button>
            <button onClick={() => handleFilterChange('MONTH')} className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg">
              This Month
            </button>
            <button onClick={() => handleFilterChange('CUSTOM')} className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg">
              Custom Date
            </button>
            <button
              onClick={openResetModal}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
            >
              Reset Expenses
            </button>
          </div>

          {filter === 'CUSTOM' && (
            <div className="mt-4">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg mr-4"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
        </div>

        {showConfirmModal && (
          <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Deletion</h2>
              <p className="mb-2">You are about to delete expenses for:</p>
              <p><strong>Date Range:</strong> {resetInfo.dateRange}</p>
              <p><strong>Category:</strong> {resetInfo.category}</p>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={confirmReset}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="lg:col-span-2">
            <AddExpense onExpenseAdded={fetchExpenses} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RecentExpenses expenses={expenses} onRefresh={fetchExpenses} />
          <CategoryTotals categoryTotals={categoryTotals} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;