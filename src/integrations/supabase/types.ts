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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      battery_datasheet_history: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          created_at: string
          datasheet_id: string
          fields: string[]
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          datasheet_id: string
          fields?: string[]
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          created_at?: string
          datasheet_id?: string
          fields?: string[]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battery_datasheet_history_datasheet_id_fkey"
            columns: ["datasheet_id"]
            isOneToOne: false
            referencedRelation: "battery_datasheets"
            referencedColumns: ["id"]
          },
        ]
      }
      battery_datasheets: {
        Row: {
          acquisition_method: string | null
          application: string | null
          calendar_years: number | null
          capacity_ah: number | null
          certifications: string | null
          charge_eff_pct: number | null
          chemistry: string
          chemistry_detail: string | null
          comments: string | null
          consulted_on: string | null
          cooling: string | null
          cost_source: string | null
          created_at: string
          currency: string | null
          cycle_conditions: string | null
          cycles: number | null
          degradation_pct_year: number | null
          degradation_source: string | null
          description: string | null
          discharge_eff_pct: number | null
          doc_url: string | null
          dod_pct: number | null
          energy_kwh: number | null
          eol_capacity_pct: number | null
          extra: Json
          has_bms: boolean | null
          height_mm: number | null
          id: string
          install_cost: number | null
          installation_location: string | null
          installation_notes: string | null
          ip_rating: string | null
          length_mm: number | null
          maintenance_cost: number | null
          manufacturer: string
          mass_kg: number | null
          max_charge_a: number | null
          max_charge_kw: number | null
          max_discharge_a: number | null
          max_discharge_kw: number | null
          name: string
          nominal_voltage_v: number | null
          owner_id: string
          page_ref: string | null
          price: number | null
          price_date: string | null
          product_ref: string | null
          published_on: string | null
          replacement_cost: number | null
          rte_pct: number | null
          safety_notes: string | null
          sheet_version: string | null
          soc_max_pct: number | null
          soc_min_pct: number | null
          source: string
          status: Database["public"]["Enums"]["solar_status"]
          technology_id: string | null
          temp_max_c: number | null
          temp_min_c: number | null
          temp_recommended_c: number | null
          updated_at: string
          usable_kwh: number | null
          voltage_max_v: number | null
          voltage_min_v: number | null
          warranty: string | null
          warranty_limits: string | null
          width_mm: number | null
        }
        Insert: {
          acquisition_method?: string | null
          application?: string | null
          calendar_years?: number | null
          capacity_ah?: number | null
          certifications?: string | null
          charge_eff_pct?: number | null
          chemistry: string
          chemistry_detail?: string | null
          comments?: string | null
          consulted_on?: string | null
          cooling?: string | null
          cost_source?: string | null
          created_at?: string
          currency?: string | null
          cycle_conditions?: string | null
          cycles?: number | null
          degradation_pct_year?: number | null
          degradation_source?: string | null
          description?: string | null
          discharge_eff_pct?: number | null
          doc_url?: string | null
          dod_pct?: number | null
          energy_kwh?: number | null
          eol_capacity_pct?: number | null
          extra?: Json
          has_bms?: boolean | null
          height_mm?: number | null
          id?: string
          install_cost?: number | null
          installation_location?: string | null
          installation_notes?: string | null
          ip_rating?: string | null
          length_mm?: number | null
          maintenance_cost?: number | null
          manufacturer: string
          mass_kg?: number | null
          max_charge_a?: number | null
          max_charge_kw?: number | null
          max_discharge_a?: number | null
          max_discharge_kw?: number | null
          name: string
          nominal_voltage_v?: number | null
          owner_id: string
          page_ref?: string | null
          price?: number | null
          price_date?: string | null
          product_ref?: string | null
          published_on?: string | null
          replacement_cost?: number | null
          rte_pct?: number | null
          safety_notes?: string | null
          sheet_version?: string | null
          soc_max_pct?: number | null
          soc_min_pct?: number | null
          source: string
          status?: Database["public"]["Enums"]["solar_status"]
          technology_id?: string | null
          temp_max_c?: number | null
          temp_min_c?: number | null
          temp_recommended_c?: number | null
          updated_at?: string
          usable_kwh?: number | null
          voltage_max_v?: number | null
          voltage_min_v?: number | null
          warranty?: string | null
          warranty_limits?: string | null
          width_mm?: number | null
        }
        Update: {
          acquisition_method?: string | null
          application?: string | null
          calendar_years?: number | null
          capacity_ah?: number | null
          certifications?: string | null
          charge_eff_pct?: number | null
          chemistry?: string
          chemistry_detail?: string | null
          comments?: string | null
          consulted_on?: string | null
          cooling?: string | null
          cost_source?: string | null
          created_at?: string
          currency?: string | null
          cycle_conditions?: string | null
          cycles?: number | null
          degradation_pct_year?: number | null
          degradation_source?: string | null
          description?: string | null
          discharge_eff_pct?: number | null
          doc_url?: string | null
          dod_pct?: number | null
          energy_kwh?: number | null
          eol_capacity_pct?: number | null
          extra?: Json
          has_bms?: boolean | null
          height_mm?: number | null
          id?: string
          install_cost?: number | null
          installation_location?: string | null
          installation_notes?: string | null
          ip_rating?: string | null
          length_mm?: number | null
          maintenance_cost?: number | null
          manufacturer?: string
          mass_kg?: number | null
          max_charge_a?: number | null
          max_charge_kw?: number | null
          max_discharge_a?: number | null
          max_discharge_kw?: number | null
          name?: string
          nominal_voltage_v?: number | null
          owner_id?: string
          page_ref?: string | null
          price?: number | null
          price_date?: string | null
          product_ref?: string | null
          published_on?: string | null
          replacement_cost?: number | null
          rte_pct?: number | null
          safety_notes?: string | null
          sheet_version?: string | null
          soc_max_pct?: number | null
          soc_min_pct?: number | null
          source?: string
          status?: Database["public"]["Enums"]["solar_status"]
          technology_id?: string | null
          temp_max_c?: number | null
          temp_min_c?: number | null
          temp_recommended_c?: number | null
          updated_at?: string
          usable_kwh?: number | null
          voltage_max_v?: number | null
          voltage_min_v?: number | null
          warranty?: string | null
          warranty_limits?: string | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "battery_datasheets_technology_id_fkey"
            columns: ["technology_id"]
            isOneToOne: false
            referencedRelation: "technologies"
            referencedColumns: ["id"]
          },
        ]
      }
      biomass_reference_observations: {
        Row: {
          coordinate_reference: string | null
          country: string
          density_mg_ha: number
          id: string
          land_use: string | null
          notes: string
          period_end: string | null
          period_start: string | null
          plot_id: string
          reference: string
          region_name: string
          source: string
          source_record: string
          utm_x: number
          utm_y: number
        }
        Insert: {
          coordinate_reference?: string | null
          country: string
          density_mg_ha: number
          id?: string
          land_use?: string | null
          notes: string
          period_end?: string | null
          period_start?: string | null
          plot_id: string
          reference: string
          region_name: string
          source: string
          source_record: string
          utm_x: number
          utm_y: number
        }
        Update: {
          coordinate_reference?: string | null
          country?: string
          density_mg_ha?: number
          id?: string
          land_use?: string | null
          notes?: string
          period_end?: string | null
          period_start?: string | null
          plot_id?: string
          reference?: string
          region_name?: string
          source?: string
          source_record?: string
          utm_x?: number
          utm_y?: number
        }
        Relationships: []
      }
      biomass_resources: {
        Row: {
          acquisition_method: string | null
          annual_quantity_t: number | null
          availability_levels: Json
          availability_period: string | null
          biomass_status: Database["public"]["Enums"]["solar_status"]
          biomass_type: string
          biomass_type_detail: string | null
          calorific_value_mj_kg: number | null
          collected_on: string | null
          constraints: string | null
          created_at: string
          data_nature: Database["public"]["Enums"]["biomass_data_nature"]
          energy_potential_mwh: number | null
          energy_potential_source: string | null
          exploitable_fraction_pct: number | null
          id: string
          lhv_basis: string | null
          lhv_method: string | null
          moisture_pct: number | null
          owner_id: string
          period_end: string | null
          period_start: string | null
          quantity_unit: string
          resource_id: string
          seasonal_availability: Json | null
          site_id: string | null
          updated_at: string
        }
        Insert: {
          acquisition_method?: string | null
          annual_quantity_t?: number | null
          availability_levels?: Json
          availability_period?: string | null
          biomass_status?: Database["public"]["Enums"]["solar_status"]
          biomass_type: string
          biomass_type_detail?: string | null
          calorific_value_mj_kg?: number | null
          collected_on?: string | null
          constraints?: string | null
          created_at?: string
          data_nature?: Database["public"]["Enums"]["biomass_data_nature"]
          energy_potential_mwh?: number | null
          energy_potential_source?: string | null
          exploitable_fraction_pct?: number | null
          id?: string
          lhv_basis?: string | null
          lhv_method?: string | null
          moisture_pct?: number | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          quantity_unit?: string
          resource_id: string
          seasonal_availability?: Json | null
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          acquisition_method?: string | null
          annual_quantity_t?: number | null
          availability_levels?: Json
          availability_period?: string | null
          biomass_status?: Database["public"]["Enums"]["solar_status"]
          biomass_type?: string
          biomass_type_detail?: string | null
          calorific_value_mj_kg?: number | null
          collected_on?: string | null
          constraints?: string | null
          created_at?: string
          data_nature?: Database["public"]["Enums"]["biomass_data_nature"]
          energy_potential_mwh?: number | null
          energy_potential_source?: string | null
          exploitable_fraction_pct?: number | null
          id?: string
          lhv_basis?: string | null
          lhv_method?: string | null
          moisture_pct?: number | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          quantity_unit?: string
          resource_id?: string
          seasonal_availability?: Json | null
          site_id?: string | null
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
          {
            foreignKeyName: "biomass_resources_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_reference: boolean
          iso2: string | null
          iso3: string | null
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_reference?: boolean
          iso2?: string | null
          iso3?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_reference?: boolean
          iso2?: string | null
          iso3?: string | null
          latitude?: number | null
          longitude?: number | null
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
          description: string | null
          id: string
          is_reference: boolean
          name: string
          owner_id: string
          region_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_reference?: boolean
          name: string
          owner_id?: string
          region_id: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_reference?: boolean
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
      energy_demand_equipment: {
        Row: {
          category: string | null
          created_at: string
          days_per_week: number
          demand_id: string
          hours_per_day: number
          id: string
          name: string
          notes: string | null
          owner_id: string
          power_unit: string
          priority: string
          quantity: number
          sort_order: number
          unit_power: number
          usage_factor: number | null
          usage_factor_definition: string | null
          usage_factor_source: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          days_per_week: number
          demand_id: string
          hours_per_day: number
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          power_unit: string
          priority?: string
          quantity: number
          sort_order?: number
          unit_power: number
          usage_factor?: number | null
          usage_factor_definition?: string | null
          usage_factor_source?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          days_per_week?: number
          demand_id?: string
          hours_per_day?: number
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          power_unit?: string
          priority?: string
          quantity?: number
          sort_order?: number
          unit_power?: number
          usage_factor?: number | null
          usage_factor_definition?: string | null
          usage_factor_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_demand_equipment_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "energy_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_demand_history: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json
          created_at: string
          demand_id: string
          id: string
          owner_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          demand_id: string
          id?: string
          owner_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          demand_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "energy_demand_history_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "energy_demands"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_demands: {
        Row: {
          acquisition_method: string | null
          annual_demand_kwh: number | null
          assumptions: string | null
          collected_by: string | null
          comments: string | null
          consumer_category: string
          consumer_detail: string | null
          consumer_name: string | null
          created_at: string
          created_by: string | null
          criticality: string | null
          daily_demand_kwh: number | null
          daily_profile: Json
          data_time_basis: string | null
          demand_profile: Json | null
          demand_status: Database["public"]["Enums"]["solar_status"]
          description: string | null
          growth_rate_pct: number | null
          has_history: boolean | null
          id: string
          locality_id: string
          measured_peak_kw: number | null
          measurements: Json
          name: string
          owner_id: string
          peak_power_kw: number | null
          period_end: string | null
          period_start: string | null
          reference: string | null
          seasonal_variation: string | null
          sector: string
          site_id: string | null
          source: string | null
          study_year: number | null
          supply: Json
          updated_at: string
          users_count: number | null
          validation_status: Database["public"]["Enums"]["validation_status"]
          weekday_variation: string | null
        }
        Insert: {
          acquisition_method?: string | null
          annual_demand_kwh?: number | null
          assumptions?: string | null
          collected_by?: string | null
          comments?: string | null
          consumer_category?: string
          consumer_detail?: string | null
          consumer_name?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: string | null
          daily_demand_kwh?: number | null
          daily_profile?: Json
          data_time_basis?: string | null
          demand_profile?: Json | null
          demand_status?: Database["public"]["Enums"]["solar_status"]
          description?: string | null
          growth_rate_pct?: number | null
          has_history?: boolean | null
          id?: string
          locality_id: string
          measured_peak_kw?: number | null
          measurements?: Json
          name: string
          owner_id?: string
          peak_power_kw?: number | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          seasonal_variation?: string | null
          sector: string
          site_id?: string | null
          source?: string | null
          study_year?: number | null
          supply?: Json
          updated_at?: string
          users_count?: number | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
          weekday_variation?: string | null
        }
        Update: {
          acquisition_method?: string | null
          annual_demand_kwh?: number | null
          assumptions?: string | null
          collected_by?: string | null
          comments?: string | null
          consumer_category?: string
          consumer_detail?: string | null
          consumer_name?: string | null
          created_at?: string
          created_by?: string | null
          criticality?: string | null
          daily_demand_kwh?: number | null
          daily_profile?: Json
          data_time_basis?: string | null
          demand_profile?: Json | null
          demand_status?: Database["public"]["Enums"]["solar_status"]
          description?: string | null
          growth_rate_pct?: number | null
          has_history?: boolean | null
          id?: string
          locality_id?: string
          measured_peak_kw?: number | null
          measurements?: Json
          name?: string
          owner_id?: string
          peak_power_kw?: number | null
          period_end?: string | null
          period_start?: string | null
          reference?: string | null
          seasonal_variation?: string | null
          sector?: string
          site_id?: string | null
          source?: string | null
          study_year?: number | null
          supply?: Json
          updated_at?: string
          users_count?: number | null
          validation_status?: Database["public"]["Enums"]["validation_status"]
          weekday_variation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_demands_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_demands_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
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
          description: string | null
          grid_access: boolean | null
          id: string
          is_reference: boolean
          latitude: number | null
          locality_type: Database["public"]["Enums"]["locality_type"] | null
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
          description?: string | null
          grid_access?: boolean | null
          id?: string
          is_reference?: boolean
          latitude?: number | null
          locality_type?: Database["public"]["Enums"]["locality_type"] | null
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
          description?: string | null
          grid_access?: boolean | null
          id?: string
          is_reference?: boolean
          latitude?: number | null
          locality_type?: Database["public"]["Enums"]["locality_type"] | null
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
      project_energy_production: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          input_snapshot: Json
          method: string
          owner_id: string
          production_kwh: number
          project_id: string
          requested_by: string
          resource_id: string
          technology: string
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          input_snapshot: Json
          method: string
          owner_id: string
          production_kwh: number
          project_id: string
          requested_by: string
          resource_id: string
          technology: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          input_snapshot?: Json
          method?: string
          owner_id?: string
          production_kwh?: number
          project_id?: string
          requested_by?: string
          resource_id?: string
          technology?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_energy_production_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_energy_production_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      project_finance_assumption_history: {
        Row: {
          action: string
          assumption_id: string
          changed_by: string
          created_at: string
          id: string
          owner_id: string
          project_id: string
          snapshot: Json
        }
        Insert: {
          action: string
          assumption_id: string
          changed_by: string
          created_at?: string
          id?: string
          owner_id: string
          project_id: string
          snapshot: Json
        }
        Update: {
          action?: string
          assumption_id?: string
          changed_by?: string
          created_at?: string
          id?: string
          owner_id?: string
          project_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_finance_assumption_history_assumption_id_fkey"
            columns: ["assumption_id"]
            isOneToOne: false
            referencedRelation: "project_finance_assumptions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_finance_assumptions: {
        Row: {
          annual_opex: number
          capex: number
          created_at: string
          currency: string
          degradation_pct_per_year: number
          discount_rate_pct: number
          id: string
          lifetime_years: number
          notes: string | null
          owner_id: string
          production_simulation_id: string | null
          project_id: string
          replacements: Json
          updated_at: string
          updated_by: string | null
          year_one_production_kwh: number | null
        }
        Insert: {
          annual_opex?: number
          capex: number
          created_at?: string
          currency?: string
          degradation_pct_per_year?: number
          discount_rate_pct: number
          id?: string
          lifetime_years: number
          notes?: string | null
          owner_id: string
          production_simulation_id?: string | null
          project_id: string
          replacements?: Json
          updated_at?: string
          updated_by?: string | null
          year_one_production_kwh?: number | null
        }
        Update: {
          annual_opex?: number
          capex?: number
          created_at?: string
          currency?: string
          degradation_pct_per_year?: number
          discount_rate_pct?: number
          id?: string
          lifetime_years?: number
          notes?: string | null
          owner_id?: string
          production_simulation_id?: string | null
          project_id?: string
          replacements?: Json
          updated_at?: string
          updated_by?: string | null
          year_one_production_kwh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_finance_assumptions_production_simulation_id_fkey"
            columns: ["production_simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_finance_assumptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
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
      project_solar_production: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          input_snapshot: Json
          method: string
          owner_id: string
          production_kwh: number
          project_id: string
          requested_by: string
          resource_id: string | null
          settings_snapshot: Json | null
        }
        Insert: {
          created_at?: string
          engine_version: string
          id?: string
          input_snapshot: Json
          method: string
          owner_id: string
          production_kwh: number
          project_id: string
          requested_by: string
          resource_id?: string | null
          settings_snapshot?: Json | null
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          input_snapshot?: Json
          method?: string
          owner_id?: string
          production_kwh?: number
          project_id?: string
          requested_by?: string
          resource_id?: string | null
          settings_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_solar_production_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_solar_production_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      project_storage_config_history: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json | null
          config_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json | null
          config_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json | null
          config_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_storage_config_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "project_storage_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_storage_configs: {
        Row: {
          aging_assumption: string | null
          charge_eff_pct: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          datasheet_id: string
          discharge_eff_pct: number | null
          id: string
          justification: string | null
          module_count: number
          owner_id: string
          parallel_count: number | null
          project_id: string
          reference_temp_c: number | null
          retained_cost: number | null
          rte_pct: number | null
          series_count: number | null
          snapshot: Json | null
          snapshot_at: string | null
          soc_max_pct: number | null
          soc_min_pct: number | null
          status: Database["public"]["Enums"]["solar_status"]
          updated_at: string
          usable_energy_limit_kwh: number | null
        }
        Insert: {
          aging_assumption?: string | null
          charge_eff_pct?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          datasheet_id: string
          discharge_eff_pct?: number | null
          id?: string
          justification?: string | null
          module_count: number
          owner_id: string
          parallel_count?: number | null
          project_id: string
          reference_temp_c?: number | null
          retained_cost?: number | null
          rte_pct?: number | null
          series_count?: number | null
          snapshot?: Json | null
          snapshot_at?: string | null
          soc_max_pct?: number | null
          soc_min_pct?: number | null
          status?: Database["public"]["Enums"]["solar_status"]
          updated_at?: string
          usable_energy_limit_kwh?: number | null
        }
        Update: {
          aging_assumption?: string | null
          charge_eff_pct?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          datasheet_id?: string
          discharge_eff_pct?: number | null
          id?: string
          justification?: string | null
          module_count?: number
          owner_id?: string
          parallel_count?: number | null
          project_id?: string
          reference_temp_c?: number | null
          retained_cost?: number | null
          rte_pct?: number | null
          series_count?: number | null
          snapshot?: Json | null
          snapshot_at?: string | null
          soc_max_pct?: number | null
          soc_min_pct?: number | null
          status?: Database["public"]["Enums"]["solar_status"]
          updated_at?: string
          usable_energy_limit_kwh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_storage_configs_datasheet_id_fkey"
            columns: ["datasheet_id"]
            isOneToOne: false
            referencedRelation: "battery_datasheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_storage_configs_project_id_fkey"
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
          description: string | null
          id: string
          is_reference: boolean
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_reference?: boolean
          name: string
          owner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_reference?: boolean
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
      resource_pre_analyses: {
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
          requested_by: string
          resource_id: string
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
          input_snapshot?: Json
          missing_information?: Json
          model: string
          owner_id: string
          requested_by: string
          resource_id: string
          scope_note?: string
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
          requested_by?: string
          resource_id?: string
          scope_note?: string
          status?: Database["public"]["Enums"]["pre_analysis_status"]
          verification_points?: Json
        }
        Relationships: [
          {
            foreignKeyName: "resource_pre_analyses_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_history: {
        Row: {
          actor_id: string
          created_at: string
          engineer_enabled: boolean
          id: string
          target_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          engineer_enabled: boolean
          id?: string
          target_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          engineer_enabled?: boolean
          id?: string
          target_id?: string
        }
        Relationships: []
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
      site_weather_datasets: {
        Row: {
          created_at: string
          data_nature: string
          id: string
          locality_id: string
          name: string
          notes: string
          owner_id: string
          period_end: string
          period_start: string
          provenance: Json
          radiation_unit: string
          reference: string
          samples: Json
          site_id: string
          source: string
          status: Database["public"]["Enums"]["solar_status"]
          time_standard: string
          updated_at: string
          wind_height_m: number
        }
        Insert: {
          created_at?: string
          data_nature?: string
          id?: string
          locality_id: string
          name: string
          notes?: string
          owner_id: string
          period_end: string
          period_start: string
          provenance?: Json
          radiation_unit: string
          reference?: string
          samples: Json
          site_id: string
          source: string
          status?: Database["public"]["Enums"]["solar_status"]
          time_standard?: string
          updated_at?: string
          wind_height_m: number
        }
        Update: {
          created_at?: string
          data_nature?: string
          id?: string
          locality_id?: string
          name?: string
          notes?: string
          owner_id?: string
          period_end?: string
          period_start?: string
          provenance?: Json
          radiation_unit?: string
          reference?: string
          samples?: Json
          site_id?: string
          source?: string
          status?: Database["public"]["Enums"]["solar_status"]
          time_standard?: string
          updated_at?: string
          wind_height_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_weather_datasets_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_weather_datasets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      solar_resources: {
        Row: {
          acquisition_method: string | null
          annual_irradiation_kwh_m2: number | null
          avg_temperature_c: number | null
          collected_on: string | null
          created_at: string
          data_nature: Database["public"]["Enums"]["solar_data_nature"]
          dhi_kwh_m2_day: number | null
          dhi_unit: string
          dni_kwh_m2_day: number | null
          dni_unit: string
          ghi_kwh_m2_day: number | null
          ghi_unit: string
          id: string
          max_temperature_c: number | null
          min_temperature_c: number | null
          owner_id: string
          period_end: string | null
          period_start: string | null
          resource_id: string
          site_id: string | null
          solar_status: Database["public"]["Enums"]["solar_status"]
          sunshine_hours: number | null
          sunshine_unit: string
          updated_at: string
        }
        Insert: {
          acquisition_method?: string | null
          annual_irradiation_kwh_m2?: number | null
          avg_temperature_c?: number | null
          collected_on?: string | null
          created_at?: string
          data_nature?: Database["public"]["Enums"]["solar_data_nature"]
          dhi_kwh_m2_day?: number | null
          dhi_unit?: string
          dni_kwh_m2_day?: number | null
          dni_unit?: string
          ghi_kwh_m2_day?: number | null
          ghi_unit?: string
          id?: string
          max_temperature_c?: number | null
          min_temperature_c?: number | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          resource_id: string
          site_id?: string | null
          solar_status?: Database["public"]["Enums"]["solar_status"]
          sunshine_hours?: number | null
          sunshine_unit?: string
          updated_at?: string
        }
        Update: {
          acquisition_method?: string | null
          annual_irradiation_kwh_m2?: number | null
          avg_temperature_c?: number | null
          collected_on?: string | null
          created_at?: string
          data_nature?: Database["public"]["Enums"]["solar_data_nature"]
          dhi_kwh_m2_day?: number | null
          dhi_unit?: string
          dni_kwh_m2_day?: number | null
          dni_unit?: string
          ghi_kwh_m2_day?: number | null
          ghi_unit?: string
          id?: string
          max_temperature_c?: number | null
          min_temperature_c?: number | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          resource_id?: string
          site_id?: string | null
          solar_status?: Database["public"]["Enums"]["solar_status"]
          sunshine_hours?: number | null
          sunshine_unit?: string
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
          {
            foreignKeyName: "solar_resources_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sites: {
        Row: {
          altitude_m: number | null
          area_m2: number | null
          code: string | null
          created_at: string
          data_period: string | null
          data_quality: string | null
          data_source: string | null
          grid_access: boolean | null
          grid_distance_km: number | null
          id: string
          latitude: number | null
          locality_id: string | null
          longitude: number | null
          name: string
          notes: string | null
          owner_id: string
          planned_power_kw: number | null
          site_type: Database["public"]["Enums"]["study_site_type"]
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          altitude_m?: number | null
          area_m2?: number | null
          code?: string | null
          created_at?: string
          data_period?: string | null
          data_quality?: string | null
          data_source?: string | null
          grid_access?: boolean | null
          grid_distance_km?: number | null
          id?: string
          latitude?: number | null
          locality_id?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          owner_id?: string
          planned_power_kw?: number | null
          site_type?: Database["public"]["Enums"]["study_site_type"]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          altitude_m?: number | null
          area_m2?: number | null
          code?: string | null
          created_at?: string
          data_period?: string | null
          data_quality?: string | null
          data_source?: string | null
          grid_access?: boolean | null
          grid_distance_km?: number | null
          id?: string
          latitude?: number | null
          locality_id?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          owner_id?: string
          planned_power_kw?: number | null
          site_type?: Database["public"]["Enums"]["study_site_type"]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sites_locality_id_fkey"
            columns: ["locality_id"]
            isOneToOne: false
            referencedRelation: "localities"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_settings: {
        Row: {
          conversion_efficiency: number
          created_at: string
          created_by: string
          efficiency: number
          id: string
          justification: string
          lifetime_years: number
          technology: string
        }
        Insert: {
          conversion_efficiency: number
          created_at?: string
          created_by: string
          efficiency: number
          id?: string
          justification: string
          lifetime_years: number
          technology: string
        }
        Update: {
          conversion_efficiency?: number
          created_at?: string
          created_by?: string
          efficiency?: number
          id?: string
          justification?: string
          lifetime_years?: number
          technology?: string
        }
        Relationships: []
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
          period_end: string | null
          period_start: string | null
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
          period_end?: string | null
          period_start?: string | null
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
          period_end?: string | null
          period_start?: string | null
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
          acquisition_method: string | null
          air_density_kg_m3: number | null
          average_speed_ms: number | null
          capacity_factor_method: string | null
          capacity_factor_pct: number | null
          collected_on: string | null
          created_at: string
          data_nature: Database["public"]["Enums"]["wind_data_nature"]
          direction_deg: number | null
          id: string
          maximum_speed_ms: number | null
          measurement_height_m: number | null
          owner_id: string
          period_end: string | null
          period_start: string | null
          resource_id: string
          site_id: string | null
          speed_distribution: Json | null
          timeseries: Json | null
          updated_at: string
          wind_status: Database["public"]["Enums"]["solar_status"]
        }
        Insert: {
          acquisition_method?: string | null
          air_density_kg_m3?: number | null
          average_speed_ms?: number | null
          capacity_factor_method?: string | null
          capacity_factor_pct?: number | null
          collected_on?: string | null
          created_at?: string
          data_nature?: Database["public"]["Enums"]["wind_data_nature"]
          direction_deg?: number | null
          id?: string
          maximum_speed_ms?: number | null
          measurement_height_m?: number | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          resource_id: string
          site_id?: string | null
          speed_distribution?: Json | null
          timeseries?: Json | null
          updated_at?: string
          wind_status?: Database["public"]["Enums"]["solar_status"]
        }
        Update: {
          acquisition_method?: string | null
          air_density_kg_m3?: number | null
          average_speed_ms?: number | null
          capacity_factor_method?: string | null
          capacity_factor_pct?: number | null
          collected_on?: string | null
          created_at?: string
          data_nature?: Database["public"]["Enums"]["wind_data_nature"]
          direction_deg?: number | null
          id?: string
          maximum_speed_ms?: number | null
          measurement_height_m?: number | null
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          resource_id?: string
          site_id?: string | null
          speed_distribution?: Json | null
          timeseries?: Json | null
          updated_at?: string
          wind_status?: Database["public"]["Enums"]["solar_status"]
        }
        Relationships: [
          {
            foreignKeyName: "wind_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: true
            referencedRelation: "energy_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wind_resources_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "study_sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      estimate_project_energy: {
        Args: {
          _assumptions: string
          _power_kw: number
          _project_id: string
          _resource_id: string
          _settings_id: string
        }
        Returns: string
      }
      estimate_project_solar: {
        Args: {
          _assumptions: string
          _performance_ratio: number
          _power_kwp: number
          _project_id: string
          _resource_id: string
        }
        Returns: string
      }
      estimate_project_solar_configured: {
        Args: {
          _assumptions: string
          _power_kwp: number
          _project_id: string
          _resource_id: string
          _settings_id: string
        }
        Returns: string
      }
      set_tester_engineer: {
        Args: { _enabled: boolean; _target_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "engineer" | "analyst" | "viewer"
      biomass_data_nature:
        | "measured"
        | "technical_study"
        | "inventory"
        | "pdf"
        | "spreadsheet"
        | "api"
        | "estimate"
        | "assumption"
      locality_type:
        | "urbain"
        | "periurbain"
        | "rural"
        | "village"
        | "zone_industrielle"
        | "autre"
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
      solar_data_nature:
        | "measured"
        | "imported"
        | "api"
        | "estimate"
        | "assumption"
      solar_status:
        | "unverified"
        | "in_review"
        | "validated"
        | "rejected"
        | "archived"
      study_site_type:
        | "centrale"
        | "micro_reseau"
        | "site_isole"
        | "site_agricole"
        | "site_industriel"
        | "autre"
      validation_status: "pending" | "validated" | "rejected"
      wind_data_nature:
        | "measured"
        | "technical_study"
        | "imported"
        | "api"
        | "estimate"
        | "assumption"
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
      biomass_data_nature: [
        "measured",
        "technical_study",
        "inventory",
        "pdf",
        "spreadsheet",
        "api",
        "estimate",
        "assumption",
      ],
      locality_type: [
        "urbain",
        "periurbain",
        "rural",
        "village",
        "zone_industrielle",
        "autre",
      ],
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
      solar_data_nature: [
        "measured",
        "imported",
        "api",
        "estimate",
        "assumption",
      ],
      solar_status: [
        "unverified",
        "in_review",
        "validated",
        "rejected",
        "archived",
      ],
      study_site_type: [
        "centrale",
        "micro_reseau",
        "site_isole",
        "site_agricole",
        "site_industriel",
        "autre",
      ],
      validation_status: ["pending", "validated", "rejected"],
      wind_data_nature: [
        "measured",
        "technical_study",
        "imported",
        "api",
        "estimate",
        "assumption",
      ],
    },
  },
} as const
