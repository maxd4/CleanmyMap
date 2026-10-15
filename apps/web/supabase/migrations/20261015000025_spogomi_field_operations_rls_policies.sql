-- Make the service-only contract explicit for field-operation evidence.
-- The tables remain inaccessible to anon/authenticated roles.

create policy spogomi_field_operations_service_only
  on public.spogomi_field_operations for all to service_role
  using (true) with check (true);

create policy spogomi_field_operation_history_service_only
  on public.spogomi_field_operation_history for all to service_role
  using (true) with check (true);

create policy spogomi_team_returns_service_only
  on public.spogomi_team_returns for all to service_role
  using (true) with check (true);

create policy spogomi_team_return_history_service_only
  on public.spogomi_team_return_history for all to service_role
  using (true) with check (true);

create policy spogomi_field_incidents_service_only
  on public.spogomi_field_incidents for all to service_role
  using (true) with check (true);

create policy spogomi_field_incident_history_service_only
  on public.spogomi_field_incident_history for all to service_role
  using (true) with check (true);

create policy spogomi_operational_measurements_service_only
  on public.spogomi_operational_measurements for all to service_role
  using (true) with check (true);

create policy spogomi_measurement_history_service_only
  on public.spogomi_measurement_history for all to service_role
  using (true) with check (true);

create policy spogomi_measurement_imports_service_only
  on public.spogomi_measurement_imports for all to service_role
  using (true) with check (true);

create policy spogomi_measurement_import_rows_service_only
  on public.spogomi_measurement_import_rows for all to service_role
  using (true) with check (true);
