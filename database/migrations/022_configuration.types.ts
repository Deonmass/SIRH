/** Ligne table `public.configuration` */
export interface DbConfigurationRow {
  id: number;
  titre_config: string;
  params: Record<string, unknown> | null;
  updated_at: string;
  updated_by: string | null;
}
