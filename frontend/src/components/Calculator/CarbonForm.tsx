/**
 * CarbonForm — Multi-section accessible carbon footprint input form.
 *
 * WCAG 2.1 AA compliance features:
 *   - Every input has an associated <label> via htmlFor/id pairing
 *   - aria-describedby links inputs to helper text and error messages
 *   - Radio groups use <fieldset> + <legend>
 *   - Validation errors shown with role="alert" and aria-live="polite"
 *   - Submit button uses aria-busy during calculation
 *   - All validation done client-side with Zod before API call
 */

import { type ChangeEvent, type FormEvent, useState } from 'react';
import { useCarbonStore } from '../../store/carbonStore';
import type { CarbonInput } from '../../types';
import { getDeviceId } from '../../utils/formatters';
import { carbonInputSchema, type CarbonInputForm } from '../../utils/validators';
import { LoadingSpinner } from '../shared/LoadingSpinner';

type FormErrors = Partial<Record<keyof CarbonInputForm, string>>;

const initialValues: CarbonInputForm = {
  transport_km_car_petrol: 0,
  transport_km_car_diesel: 0,
  transport_km_car_electric: 0,
  transport_km_bus: 0,
  transport_km_train: 0,
  flights_short_haul: 0,
  flights_long_haul: 0,
  home_electricity_kwh: 0,
  home_gas_kwh: 0,
  household_size: 1,
  diet_type: 'meat_medium',
  consumption_level: 'medium',
  device_id: getDeviceId(),
};

const InputField = ({
  id,
  label,
  value,
  unit,
  helper,
  error,
  step = 'any',
  min = 0,
  max,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: number;
  unit?: string;
  helper?: string;
  error?: string;
  step?: string | number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  onBlur: () => void;
}) => {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [helper ? helperId : '', error ? errorId : ''].filter(Boolean).join(' ');

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {unit && <span className="text-gray-400 font-normal ml-1">({unit})</span>}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-describedby={describedBy || undefined}
        aria-invalid={!!error}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value) || 0)}
        onBlur={onBlur}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm focus:outline-none
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          transition-colors duration-150
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white hover:border-gray-400'}
        `}
      />
      {helper && (
        <span id={helperId} className="text-xs text-gray-500">
          {helper}
        </span>
      )}
      {error && (
        <span
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-xs text-red-600 flex items-center gap-1"
        >
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
    </div>
  );
};

const SectionHeader = ({
  icon,
  title,
  description,
  id,
}: {
  icon: string;
  title: string;
  description: string;
  id: string;
}) => (
  <div className="flex items-start gap-3 mb-4 pb-3 border-b border-gray-100">
    <span className="text-2xl" aria-hidden="true">
      {icon}
    </span>
    <div>
      <h2 id={id} className="text-lg font-semibold text-gray-900">
        {title}
      </h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

export const CarbonForm = () => {
  const [values, setValues] = useState<CarbonInputForm>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CarbonInputForm, boolean>>>({});

  const calculate = useCarbonStore(s => s.calculate);
  const isCalculating = useCarbonStore(s => s.isCalculating);
  const storeError = useCarbonStore(s => s.error);
  const clearError = useCarbonStore(s => s.clearError);

  const validateField = (field: keyof CarbonInputForm, value: unknown) => {
    const partial = { ...values, [field]: value };
    const result = carbonInputSchema.safeParse(partial);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const msg = fieldErrors[field]?.[0];
      setErrors(prev => ({ ...prev, [field]: msg ?? undefined }));
    } else {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updateField = <K extends keyof CarbonInputForm>(field: K, value: CarbonInputForm[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
    if (storeError) clearError();
  };

  const handleBlur = (field: keyof CarbonInputForm) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, values[field]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields touched
    const allTouched = Object.keys(values).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<string, boolean>
    );
    setTouched(allTouched);

    const result = carbonInputSchema.safeParse(values);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const newErrors: FormErrors = {};
      for (const [k, msgs] of Object.entries(flat)) {
        if (msgs?.[0]) newErrors[k as keyof CarbonInputForm] = msgs[0];
      }
      setErrors(newErrors);
      return;
    }

    await calculate(result.data as CarbonInput);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Carbon footprint calculator form"
      noValidate
      className="space-y-8 animate-fade-in"
    >
      {/* ---------------------------------------------------------------- */}
      {/* Transport Section                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-labelledby="transport-heading"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <SectionHeader
          id="transport-heading"
          icon="🚗"
          title="Transport"
          description="Enter your annual travel distances and number of flights."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            id="transport_km_car_petrol"
            label="Petrol Car"
            value={values.transport_km_car_petrol}
            unit="km/year"
            helper="Annual kilometres driven in a petrol or hybrid car"
            error={errors.transport_km_car_petrol}
            onChange={v => updateField('transport_km_car_petrol', v)}
            onBlur={() => handleBlur('transport_km_car_petrol')}
          />
          <InputField
            id="transport_km_car_diesel"
            label="Diesel Car"
            value={values.transport_km_car_diesel}
            unit="km/year"
            helper="Annual kilometres driven in a diesel car"
            error={errors.transport_km_car_diesel}
            onChange={v => updateField('transport_km_car_diesel', v)}
            onBlur={() => handleBlur('transport_km_car_diesel')}
          />
          <InputField
            id="transport_km_car_electric"
            label="Electric Vehicle"
            value={values.transport_km_car_electric}
            unit="km/year"
            helper="Annual kilometres driven in a battery electric car"
            error={errors.transport_km_car_electric}
            onChange={v => updateField('transport_km_car_electric', v)}
            onBlur={() => handleBlur('transport_km_car_electric')}
          />
          <InputField
            id="transport_km_bus"
            label="Bus"
            value={values.transport_km_bus}
            unit="km/year"
            helper="Annual kilometres travelled by bus or coach"
            error={errors.transport_km_bus}
            onChange={v => updateField('transport_km_bus', v)}
            onBlur={() => handleBlur('transport_km_bus')}
          />
          <InputField
            id="transport_km_train"
            label="Train / Metro"
            value={values.transport_km_train}
            unit="km/year"
            helper="Annual kilometres by train, metro, or tram"
            error={errors.transport_km_train}
            onChange={v => updateField('transport_km_train', v)}
            onBlur={() => handleBlur('transport_km_train')}
          />
          <InputField
            id="flights_short_haul"
            label="Short-Haul Flights"
            value={values.flights_short_haul}
            unit="flights/year"
            helper="Flights under 3 hours (e.g. London to Paris)"
            error={errors.flights_short_haul}
            step={1}
            min={0}
            max={50}
            onChange={v => updateField('flights_short_haul', Math.round(v))}
            onBlur={() => handleBlur('flights_short_haul')}
          />
          <InputField
            id="flights_long_haul"
            label="Long-Haul Flights"
            value={values.flights_long_haul}
            unit="flights/year"
            helper="Flights over 3 hours (e.g. London to New York)"
            error={errors.flights_long_haul}
            step={1}
            min={0}
            max={20}
            onChange={v => updateField('flights_long_haul', Math.round(v))}
            onBlur={() => handleBlur('flights_long_haul')}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Home Energy Section                                               */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-labelledby="home-heading"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <SectionHeader
          id="home-heading"
          icon="🏠"
          title="Home Energy"
          description="Your household's annual energy consumption. Costs are split equally across household members."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            id="home_electricity_kwh"
            label="Electricity"
            value={values.home_electricity_kwh}
            unit="kWh/year"
            helper="Check your energy bills — UK average is ~3,700 kWh/year"
            error={errors.home_electricity_kwh}
            onChange={v => updateField('home_electricity_kwh', v)}
            onBlur={() => handleBlur('home_electricity_kwh')}
          />
          <InputField
            id="home_gas_kwh"
            label="Natural Gas"
            value={values.home_gas_kwh}
            unit="kWh/year"
            helper="UK average is ~12,000 kWh/year for heating and cooking"
            error={errors.home_gas_kwh}
            onChange={v => updateField('home_gas_kwh', v)}
            onBlur={() => handleBlur('home_gas_kwh')}
          />
          <InputField
            id="household_size"
            label="Household Size"
            value={values.household_size}
            unit="people"
            helper="Number of people sharing your home (home emissions split equally)"
            error={errors.household_size}
            step={1}
            min={1}
            max={10}
            onChange={v => updateField('household_size', Math.round(v))}
            onBlur={() => handleBlur('household_size')}
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Diet & Lifestyle Section                                          */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-labelledby="lifestyle-heading"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <SectionHeader
          id="lifestyle-heading"
          icon="🥗"
          title="Diet & Lifestyle"
          description="Your dietary pattern and consumption habits account for a significant share of emissions."
        />
        <div className="space-y-6">
          {/* Diet Type — radio group */}
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-3">
              Diet Type
              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                Select the option that best describes your typical diet
              </span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  {
                    value: 'meat_heavy',
                    label: '🥩 Meat-heavy',
                    desc: 'Meat with most meals (>100g/day)',
                  },
                  {
                    value: 'meat_medium',
                    label: '🍗 Meat-moderate',
                    desc: 'Meat a few times a week',
                  },
                  {
                    value: 'vegetarian',
                    label: '🥚 Vegetarian',
                    desc: 'No meat, but dairy & eggs ok',
                  },
                  { value: 'vegan', label: '🌱 Vegan', desc: 'Fully plant-based diet' },
                ] as const
              ).map(({ value, label, desc }) => (
                <label
                  key={value}
                  htmlFor={`diet-type-${value}`}
                  className={`
                    flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer
                    transition-colors duration-150 hover:border-primary-300
                    ${
                      values.diet_type === value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white'
                    }
                  `}
                >
                  <input
                    type="radio"
                    id={`diet-type-${value}`}
                    name="diet_type"
                    value={value}
                    checked={values.diet_type === value}
                    onChange={() => updateField('diet_type', value)}
                    className="mt-0.5 accent-primary-600"
                  />
                  <span className="sr-only">{label}</span>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    <span className="block text-xs text-gray-500">{desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Consumption Level */}
          <div className="space-y-2">
            <label htmlFor="consumption_level" className="block text-sm font-medium text-gray-700">
              Shopping & Consumption Level
            </label>
            <span id="consumption-helper" className="text-xs text-gray-500 block">
              How much do you typically spend on new goods (clothes, electronics, furniture)?
            </span>
            <select
              id="consumption_level"
              value={values.consumption_level}
              onChange={e =>
                updateField(
                  'consumption_level',
                  e.target.value as CarbonInputForm['consumption_level']
                )
              }
              aria-describedby="consumption-helper"
              className="
                w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white hover:border-gray-400 transition-colors duration-150
              "
            >
              <option value="low">🌿 Low — mostly second-hand, minimal new goods</option>
              <option value="medium">⚖️ Medium — average consumer spending</option>
              <option value="high">🛒 High — frequent new purchases</option>
            </select>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Error Banner                                                      */}
      {/* ---------------------------------------------------------------- */}
      {storeError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
        >
          <span className="text-red-500 text-lg" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <p className="text-sm font-medium text-red-800">Calculation failed</p>
            <p className="text-sm text-red-600">{storeError}</p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Submit Button                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isCalculating}
          aria-busy={isCalculating}
          aria-label={
            isCalculating ? 'Calculating your carbon footprint...' : 'Calculate my carbon footprint'
          }
          className="
            flex items-center gap-3 bg-primary-600 text-white
            px-8 py-4 rounded-2xl text-base font-semibold
            hover:bg-primary-700 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
            transition-all duration-200 shadow-lg shadow-primary-600/25
            min-w-[220px] justify-center
          "
        >
          {isCalculating ? (
            <LoadingSpinner label="Calculating..." size="sm" />
          ) : (
            <>
              <span aria-hidden="true">🌍</span>
              Calculate Footprint
            </>
          )}
        </button>
      </div>
    </form>
  );
};
