export function UsersPage() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Users</h2>
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">User management will be implemented here.</p>
        <div className="mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 font-medium text-muted-foreground">Name</th>
                <th className="pb-2 font-medium text-muted-foreground">Email</th>
                <th className="pb-2 font-medium text-muted-foreground">Role</th>
                <th className="pb-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3 text-muted-foreground" colSpan={4}>
                  No users loaded yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
