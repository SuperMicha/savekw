import { useState } from "react";
import { api } from "@/utils/api";

interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber: string;
  emailConfirmedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  isAdmin: boolean;
  isBlocked: boolean;
}

export function UsersTab() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const {
    data: usersData,
    isLoading,
    refetch,
  } = api.admin.getUsers.useQuery({
    page,
    limit: 50,
    search: search || undefined,
  });

  const { data: userDetails } = api.admin.getUserDetails.useQuery(
    { userId: showDetails! },
    { enabled: !!showDetails },
  );

  const updateUser = api.admin.updateUser.useMutation({
    onSuccess: () => {
      void refetch();
      setEditingUser(null);
    },
  });

  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleUpdate = async () => {
    if (!editingUser) return;

    await updateUser.mutateAsync({
      userId: editingUser.id,
      name: editingUser.name,
      phoneNumber: editingUser.phoneNumber,
      isAdmin: editingUser.isAdmin,
      isBlocked: editingUser.isBlocked,
    });
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Видалити користувача ${email}? Це незворотна дія!`)) {
      return;
    }

    await deleteUser.mutateAsync({ userId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
          <p className="text-gray-600">Завантаження...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Пошук по email або ID..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => void refetch()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Оновити
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Ім'я
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Телефон
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Email підтверджено
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Останній вхід
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Дії
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {usersData?.users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {user.email}
                    </span>
                    <span className="text-xs text-gray-500">{user.id}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {user.name || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {user.phoneNumber || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.emailConfirmedAt
                    ? new Date(user.emailConfirmedAt).toLocaleDateString(
                        "uk-UA",
                      )
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("uk-UA")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-col gap-1">
                    {user.isAdmin && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                        Admin
                      </span>
                    )}
                    {user.isBlocked && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        Blocked
                      </span>
                    )}
                    {!user.isAdmin && !user.isBlocked && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Active
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Редагувати"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setShowDetails(user.id)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Деталі"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => void handleDelete(user.id, user.email)}
                      className="text-red-600 hover:text-red-800"
                      title="Видалити"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {usersData && usersData.total > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="text-sm text-gray-700">
            Показано {page * 50 + 1}-
            {Math.min((page + 1) * 50, usersData.total)} з {usersData.total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Попередня
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!usersData.hasMore}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Наступна
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              Редагувати користувача
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email (не редагується)
                </label>
                <input
                  type="text"
                  value={editingUser.email}
                  disabled
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ім'я
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Телефон
                </label>
                <input
                  type="text"
                  value={editingUser.phoneNumber}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      phoneNumber: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={editingUser.isAdmin}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      isAdmin: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="isAdmin"
                  className="text-sm font-medium text-gray-700"
                >
                  Адміністратор
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBlocked"
                  checked={editingUser.isBlocked}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      isBlocked: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label
                  htmlFor="isBlocked"
                  className="text-sm font-medium text-gray-700"
                >
                  Заблокований
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Скасувати
              </button>
              <button
                onClick={() => void handleUpdate()}
                disabled={updateUser.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateUser.isPending ? "Збереження..." : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && userDetails && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="mx-4 w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Деталі користувача</h3>
              <button
                onClick={() => setShowDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-700">Email:</p>
                <p className="text-sm text-gray-900">
                  {userDetails.user.email}
                </p>
              </div>

              <h4 className="mt-4 font-medium text-gray-900">Properties:</h4>
              {userDetails.properties.map((prop) => (
                <div key={prop.property} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-700">
                    {prop.property}:
                  </p>
                  <p className="text-sm break-all text-gray-900">
                    {prop.value}
                  </p>
                  <p className="text-xs text-gray-500">
                    Оновлено: {new Date(prop.updatedAt).toLocaleString("uk-UA")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
