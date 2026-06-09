export const PAGE_SIZE = 50;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// Supabase query builder con count habilitado y los filtros ya aplicados —
// solo falta acotar el rango de la página actual.
type RangedQuery<T> = {
  range: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    count: number | null;
    error: { message: string } | null;
  }>;
};

export async function paginate<T>(
  query: RangedQuery<T>,
  page: number,
  pageSize: number = PAGE_SIZE
): Promise<PaginatedResult<T>> {
  const offset = (page - 1) * pageSize;
  const { data, count, error } = await query.range(offset, offset + pageSize - 1);

  if (error) throw new Error(error.message);

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}
