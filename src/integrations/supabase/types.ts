export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      biomass_resources: {
        Row: {
          annual_quantity_t: number | null
          biomass_type: string
          calorific_value_mj_kg: number | null
          created_at: string
          energy_potential_mwh: number | null
          exploitable_fraction_pct: number | null
          id: string
          moisture_pct: number | null
          owner_id: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          annual_quantity_t?: number | null
          biomass_type: string
          calorific_value_mj_kg?: number | null
          created_at?: string
          energy_potential_mwh?: number | null
          exploitable_fraction_pct?: number | null
          id?: string
          moisture_pct?: number | null
          owner_id?: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          annual_quantity_t?: number | null
          biomass_type?: string
          calorific_value_mj_kg?: number | null
          created_at?: string
          energy_potential_mwh?: number | null
          exploitable_fraction_pct?: number | null
          id?: string
          moisture_pct?: number | null
          owner_id?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biomass_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          region_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          region_id: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          region_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_demands: {
        Row: {
          annual_demand_kwh: number | null
          assumptions: string | null
          created_at: string
          daily_demand_kwh: number | null
          demand_profile: Json | null
          growth_rate_pct: number | null
          id: string
          locality_id: string
          name: string
          owner_id: string
          peak_power_kw: number | null
          sector: string
          source: string | null
          study_year: number | null
          updated_at: string
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          annual_demand_kwh?: number | null
          assumptions?: string | null
          created_at?: string
          daily_demand_kwh?: number | null
          demand_profile?: Json | null
          growth_rate_pct?: number | null
          id?: string
          locality_id: string
          name: string
          owner_id?: string
          peak_power_kw?: number | null
          sector: string
          source?: string | null
          study_year?: number | null
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          annual_demand_kwh?: number | null
          assumptions?: string | null
          created_at?: string
          daily_demand_kwh?: number | null
          demand_profile?: Json | null
          growth_rate_pct?: number | null
          id?: string
          locality_id?: string
          name?: string
          owner_id?: string
          peak_power_kw?: number | null
          sector?: string
          source?: string | null
          study_year?: number | null
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "energy_demands_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_resources: {
        Row: {
          created_at: string
          id: string
          locality_id: string
          notes: string | null
          owner_id: string
          period: string | null
          potential_level: string | null
          quality: string | null
          reference: string | null
          resource_type: string
          source: string
          updated_at: string
          validation_status: Database["public"]["Enums"]["validation_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          locality_id: string
          notes?: string | null
          owner_id?: string
          period?: string | null
          potential_level?: string | null
          quality?: string | null
          reference?: string | null
          resource_type: string
          source: string
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Update: {
          created_at?: string
          id?: string
          locality_id?: string
          notes?: string | null
          owner_id?: string
          period?: string | null
          potential_level?: string | null
          quality?: string | null
          reference?: string | null
          resource_type?: string
          source?: string
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "energy_resources_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_assumptions: {
        Row: {
          annual_opex: number | null
          assumptions: Json
          capex: number | null
          created_at: string
          currency: string
          discount_rate_pct: number | null
          electricity_tariff: number | null
          id: string
          inflation_pct: number | null
          lifetime_years: number | null
          maintenance_cost: number | null
          owner_id: string
          project_id: string | null
          replacement_cost: number | null
          scenario_id: string | null
          updated_at: string
        }
        Insert: {
          annual_opex?: number | null
          assumptions?: Json
          capex?: number | null
          created_at?: string
          currency?: string
          discount_rate_pct?: number | null
          electricity_tariff?: number | null
          id?: string
          inflation_pct?: number | null
          lifetime_years?: number | null
          maintenance_cost?: number | null
          owner_id?: string
          project_id?: string | null
          replacement_cost?: number | null
          scenario_id?: string | null
          updated_at?: string
        }
        Update: {
          annual_opex?: number | null
          assumptions?: Json
          capex?: number | null
          created_at?: string
          currency?: string
          discount_rate_pct?: number | null
          electricity_tariff?: number | null
          id?: string
          inflation_pct?: number | null
          lifetime_years?: number | null
          maintenance_cost?: number | null
          owner_id?: string
          project_id?: string | null
          replacement_cost?: number | null
          scenario_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_assumptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_assumptions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_results: {
        Row: {
          assumption_id: string
          calculated_at: string
          created_at: string
          id: string
          input_snapshot: Json
          method: string
          metric: string
          owner_id: string
          unit: string
          value: number | null
        }
        Insert: {
          assumption_id: string
          calculated_at?: string
          created_at?: string
          id?: string
          input_snapshot: Json
          method: string
          metric: string
          owner_id?: string
          unit: string
          value?: number | null
        }
        Update: {
          assumption_id?: string
          calculated_at?: string
          created_at?: string
          id?: string
          input_snapshot?: Json
          method?: string
          metric?: string
          owner_id?: string
          unit?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_results_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "financial_assumptions"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_files: {
        Row: {
          corrected_data: Json | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          file_name: string
          id: string
          mime_type: string
          owner_id: string
          project_id: string | null
          size_bytes: number
          storage_path: string
          updated_at: string
          validation_status: Database["public"]["Enums"]["validation_status"]
          workflow_step: string
        }
        Insert: {
          corrected_data?: Json | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_name: string
          id?: string
          mime_type: string
          owner_id?: string
          project_id?: string | null
          size_bytes: number
          storage_path: string
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
          workflow_step?: string
        }
        Update: {
          corrected_data?: Json | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          file_name?: string
          id?: string
          mime_type?: string
          owner_id?: string
          project_id?: string | null
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          validation_status?: Database["public"]["Enums"]["validation_status"]
          workflow_step?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      localities: {
        Row: {
          altitude_m: number | null
          annual_demand_kwh: number | null
          code: string | null
          created_at: string
          data_period: string | null
          data_quality: string | null
          data_source: string | null
          department_id: string | null
          grid_access: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          population: number | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          altitude_m?: number | null
          annual_demand_kwh?: number | null
          code?: string | null
          created_at?: string
          data_period?: string | null
          data_quality?: string | null
          data_source?: string | null
          department_id?: string | null
          grid_access?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id?: string
          population?: number | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          altitude_m?: number | null
          annual_demand_kwh?: number | null
          code?: string | null
          created_at?: string
          data_period?: string | null
          data_quality?: string | null
          data_source?: string | null
          department_id?: string | null
          grid_access?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          population?: number | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "localities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          job_title: string | null
          locale: string
          organization: string | null
          phone: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          job_title?: string | null
          locale?: string
          organization?: string | null
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          job_title?: string | null
          locale?: string
          organization?: string | null
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      project_change_history: {
        Row: {
          action: string
          actor_id: string
          changes: Json
          created_at: string
          id: string
          owner_id: string
          project_id: string
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string
          changes?: Json
          created_at?: string
          id?: string
          owner_id?: string
          project_id: string
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string
          changes?: Json
          created_at?: string
          id?: string
          owner_id?: string
          project_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_change_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_data_fields: {
        Row: {
          created_at: string
          data_period: string | null
          field_key: string
          field_kind: Database["public"]["Enums"]["project_field_kind"]
          id: string
          label: string
          notes: string | null
          owner_id: string
          project_id: string
          quality: string | null
          section: string
          sort_order: number
          source: string | null
          unit: string | null
          updated_at: string
          value_text: string
        }
        Insert: {
          created_at?: string
          data_period?: string | null
          field_key: string
          field_kind?: Database["public"]["Enums"]["project_field_kind"]
          id?: string
          label: string
          notes?: string | null
          owner_id?: string
          project_id: string
          quality?: string | null
          section: string
          sort_order?: number
          source?: string | null
          unit?: string | null
          updated_at?: string
          value_text: string
        }
        Update: {
          created_at?: string
          data_period?: string | null
          field_key?: string
          field_kind?: Database["public"]["Enums"]["project_field_kind"]
          id?: string
          label?: string
          notes?: string | null
          owner_id?: string
          project_id?: string
          quality?: string | null
          section?: string
          sort_order?: number
          source?: string | null
          unit?: string | null
          updated_at?: string
          value_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_data_fields_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_pre_analyses: {
        Row: {
          completed_at: string | null
          created_at: string
          declared_assumptions: Json
          error_message: string | null
          gateway_run_id: string | null
          id: string
          input_snapshot: Json
          missing_information: Json
          model: string
          owner_id: string
          project_id: string
          requested_by: string
          scope_note: string
          status: Database["public"]["Enums"]["pre_analysis_status"]
          verification_points: Json
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          declared_assumptions?: Json
          error_message?: string | null
          gateway_run_id?: string | null
          id?: string
          input_snapshot: Json
          missing_information?: Json
          model: string
          owner_id?: string
          project_id: string
          requested_by?: string
          scope_note: string
          status?: Database["public"]["Enums"]["pre_analysis_status"]
          verification_points?: Json
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          declared_assumptions?: Json
          error_message?: string | null
          gateway_run_id?: string | null
          id?: string
          input_snapshot?: Json
          missing_information?: Json
          model?: string
          owner_id?: string
          project_id?: string
          requested_by?: string
          scope_note?: string
          status?: Database["public"]["Enums"]["pre_analysis_status"]
          verification_points?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_pre_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          locality_id: string | null
          metadata: Json
          name: string
          owner_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          locality_id?: string | null
          metadata?: Json
          name: string
          owner_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          locality_id?: string | null
          metadata?: Json
          name?: string
          owner_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          country_id: string
          created_at: string
          id: string
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          generated_at: string | null
          generated_file_path: string | null
          id: string
          owner_id: string
          project_id: string | null
          sections: Json
          source_snapshot: Json
          status: Database["public"]["Enums"]["record_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          generated_file_path?: string | null
          id?: string
          owner_id?: string
          project_id?: string | null
          sections?: Json
          source_snapshot?: Json
          status?: Database["public"]["Enums"]["record_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          generated_file_path?: string | null
          id?: string
          owner_id?: string
          project_id?: string | null
          sections?: Json
          source_snapshot?: Json
          status?: Database["public"]["Enums"]["record_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_results: {
        Row: {
          created_at: string
          id: string
          indicator: string
          input_snapshot: Json
          method: string
          owner_id: string
          scenario_id: string
          unit: string
          value: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          indicator: string
          input_snapshot: Json
          method: string
          owner_id?: string
          scenario_id: string
          unit: string
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          indicator?: string
          input_snapshot?: Json
          method?: string
          owner_id?: string
          scenario_id?: string
          unit?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scenario_results_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          archived: boolean
          assumptions: Json
          battery_config: Json | null
          constraints: Json
          created_at: string
          description: string | null
          id: string
          name: string
          objectives: Json
          owner_id: string
          powers: Json
          simulation_id: string | null
          technologies: Json
          updated_at: string
        }
        Insert: {
          archived?: boolean
          assumptions?: Json
          battery_config?: Json | null
          constraints?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          objectives?: Json
          owner_id?: string
          powers?: Json
          simulation_id?: string | null
          technologies?: Json
          updated_at?: string
        }
        Update: {
          archived?: boolean
          assumptions?: Json
          battery_config?: Json | null
          constraints?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          objectives?: Json
          owner_id?: string
          powers?: Json
          simulation_id?: string | null
          technologies?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_results: {
        Row: {
          assumptions_snapshot: Json
          calculated_at: string
          calculation_method: string
          created_at: string
          id: string
          input_snapshot: Json
          owner_id: string
          result_type: string
          simulation_id: string
          source_references: Json
          timeseries: Json | null
          unit: string
          value: number | null
        }
        Insert: {
          assumptions_snapshot: Json
          calculated_at?: string
          calculation_method: string
          created_at?: string
          id?: string
          input_snapshot: Json
          owner_id?: string
          result_type: string
          simulation_id: string
          source_references?: Json
          timeseries?: Json | null
          unit: string
          value?: number | null
        }
        Update: {
          assumptions_snapshot?: Json
          calculated_at?: string
          calculation_method?: string
          created_at?: string
          id?: string
          input_snapshot?: Json
          owner_id?: string
          result_type?: string
          simulation_id?: string
          source_references?: Json
          timeseries?: Json | null
          unit?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_results_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_technologies: {
        Row: {
          capacity_kwh: number | null
          created_at: string
          id: string
          installed_power_kw: number | null
          owner_id: string
          parameters: Json
          simulation_id: string
          technology_id: string
          updated_at: string
        }
        Insert: {
          capacity_kwh?: number | null
          created_at?: string
          id?: string
          installed_power_kw?: number | null
          owner_id?: string
          parameters?: Json
          simulation_id: string
          technology_id: string
          updated_at?: string
        }
        Update: {
          capacity_kwh?: number | null
          created_at?: string
          id?: string
          installed_power_kw?: number | null
          owner_id?: string
          parameters?: Json
          simulation_id?: string
          technology_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_technologies_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulation_technologies_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          assumptions: Json
          created_at: string
          demand_id: string | null
          description: string | null
          engine_version: string | null
          id: string
          locality_id: string | null
          name: string
          objective: string | null
          owner_id: string
          parameters: Json
          period_end: string | null
          period_start: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["simulation_status"]
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          demand_id?: string | null
          description?: string | null
          engine_version?: string | null
          id?: string
          locality_id?: string | null
          name: string
          objective?: string | null
          owner_id?: string
          parameters?: Json
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["simulation_status"]
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          created_at?: string
          demand_id?: string | null
          description?: string | null
          engine_version?: string | null
          id?: string
          locality_id?: string | null
          name?: string
          objective?: string | null
          owner_id?: string
          parameters?: Json
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["simulation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulations_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "energy_demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_resources: {
        Row: {
          annual_irradiation_kwh_m2: number | null
          avg_temperature_c: number | null
          created_at: string
          dhi_kwh_m2_day: number | null
          dni_kwh_m2_day: number | null
          ghi_kwh_m2_day: number | null
          id: string
          max_temperature_c: number | null
          min_temperature_c: number | null
          owner_id: string
          resource_id: string
          sunshine_hours: number | null
          updated_at: string
        }
        Insert: {
          annual_irradiation_kwh_m2?: number | null
          avg_temperature_c?: number | null
          created_at?: string
          dhi_kwh_m2_day?: number | null
          dni_kwh_m2_day?: number | null
          ghi_kwh_m2_day?: number | null
          id?: string
          max_temperature_c?: number | null
          min_temperature_c?: number | null
          owner_id?: string
          resource_id: string
          sunshine_hours?: number | null
          updated_at?: string
        }
        Update: {
          annual_irradiation_kwh_m2?: number | null
          avg_temperature_c?: number | null
          created_at?: string
          dhi_kwh_m2_day?: number | null
          dni_kwh_m2_day?: number | null
          ghi_kwh_m2_day?: number | null
          id?: string
          max_temperature_c?: number | null
          min_temperature_c?: number | null
          owner_id?: string
          resource_id?: string
          sunshine_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      technologies: {
        Row: {
          active: boolean
          category: string
          code: string
          configurable_parameters: Json
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          configurable_parameters?: Json
          created_at?: string
          description: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          configurable_parameters?: Json
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_resources: {
        Row: {
          annual_quantity_t: number | null
          calorific_value_mj_kg: number | null
          created_at: string
          energy_potential_mwh: number | null
          id: string
          moisture_pct: number | null
          owner_id: string
          recovery_method: string | null
          resource_id: string
          updated_at: string
          waste_type: string
        }
        Insert: {
          annual_quantity_t?: number | null
          calorific_value_mj_kg?: number | null
          created_at?: string
          energy_potential_mwh?: number | null
          id?: string
          moisture_pct?: number | null
          owner_id?: string
          recovery_method?: string | null
          resource_id: string
          updated_at?: string
          waste_type: string
        }
        Update: {
          annual_quantity_t?: number | null
          calorific_value_mj_kg?: number | null
          created_at?: string
          energy_potential_mwh?: number | null
          id?: string
          moisture_pct?: number | null
          owner_id?: string
          recovery_method?: string | null
          resource_id?: string
          updated_at?: string
          waste_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "waste_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      wind_resources: {
        Row: {
          air_density_kg_m3: number | null
          average_speed_ms: number | null
          capacity_factor_pct: number | null
          created_at: string
          direction_deg: number | null
          id: string
          maximum_speed_ms: number | null
          measurement_height_m: number | null
          owner_id: string
          resource_id: string
          updated_at: string
        }
        Insert: {
          air_density_kg_m3?: number | null
          average_speed_ms?: number | null
          capacity_factor_pct?: number | null
          created_at?: string
          direction_deg?: number | null
          id?: string
          maximum_speed_ms?: number | null
          measurement_height_m?: number | null
          owner_id?: string
          resource_id: string
          updated_at?: string
        }
        Update: {
          air_density_kg_m3?: number | null
          average_speed_ms?: number | null
          capacity_factor_pct?: number | null
          created_at?: string
          direction_deg?: number | null
          id?: string
          maximum_speed_ms?: number | null
          measurement_height_m?: number | null
          owner_id?: string
          resource_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wind_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "engineer" | "analyst" | "viewer"
      pre_analysis_status: "running" | "completed" | "failed"
      project_field_kind: "provided" | "assumption"
      project_status:
        | "draft"
        | "preliminary_study"
        | "feasibility"
        | "design"
        | "financing"
        | "procurement"
        | "implementation"
        | "completed"
      record_status: "draft" | "active" | "archived"
      simulation_status: "draft" | "queued" | "running" | "completed" | "failed"
      validation_status: "pending" | "validated" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "engineer", "analyst", "viewer"],
      pre_analysis_status: ["running", "completed", "failed"],
      project_field_kind: ["provided", "assumption"],
      project_status: [
        "draft",
        "preliminary_study",
        "feasibility",
        "design",
        "financing",
        "procurement",
        "implementation",
        "completed",
      ],
      record_status: ["draft", "active", "archived"],
      simulation_status: ["draft", "queued", "running", "completed", "failed"],
      validation_status: ["pending", "validated", "rejected"],
    },
  },
} as const
