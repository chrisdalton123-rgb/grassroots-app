'use client';

import React from 'react';
import { Player, SubPlanStep } from '@/types/matchday';

type Props = {
  halfMinutes: number;
  handleHalfMinutesChange: (mins: number) => void;
  squad: Player[];
  planOffPlayerId: string;
  setPlanOffPlayerId: (id: string) => void;
  planOnPlayerId: string;
  setPlanOnPlayerId: (id: string) => void;
  planMinute: number;
  setPlanMinute: (min: number) => void;
  planTargetPos: string;
  setPlanTargetPos: (pos: string) => void;
  positionSlots: string[];
  handleAddCustomSubStep: () => void;
  generatedPlan: SubPlanStep[];
  handleRemoveSubStep: (id: string) => void;
  handleUpdateSubStepPosition: (stepId: string, newPosition: string) => void;
  availablePlayerIds: string[];
  togglePlayerAvailability: (id: string) => void;
  starterMap: Record<string, string>;
  assignStarterToSlot: (slot: string, playerId: string) => void;
  autoFillStarters: () => void;
  rotationIntervalMins: number;
  setRotationIntervalMins: (mins: number) => void;
  subsPerBatch: number;
  setSubsPerBatch: (batch: number) => void;
  getProjectedMinutes: () => (Player & { projectedMins: number })[];
  handleGenerateMatchPlan: () => void;
  handleCommitPlanToMatchday: () => void;
  currentPitchCapacity: number;
  gkStrategy: 'full' | 'half' | 'rotate';
  setGkStrategy: (strategy: 'full' | 'half' | 'rotate') => void;
  halfTwoGkId: string;
  setHalfTwoGkId: (id: string) => void;
  activeFormations: { label: string; roles: string[] }[];
  formationIndex: number;
  setFormationIndex: (idx: number) => void;
};

export default function PlannerTab(props: Props) {
  const activeSquad = props.squad.filter((p) => props.availablePlayerIds.includes(p.id));
  const totalMatchMinutes = props.halfMinutes * 2;
  const currentSlots = props.activeFormations[props.formationIndex]?.roles || props.positionSlots.slice(0, props.currentPitchCapacity);
  const projectedList = props.getProjectedMinutes();

  const outfieldCount = props.gkStrategy === 'full' ? Math.max(1, activeSquad.length - 1) : activeSquad.length;
  const outfieldSlots = props.gkStrategy === 'full' ? Math.max(1, props.currentPitchCapacity - 1) : props.currentPitchCapacity;
  const targetOutfieldMins = Math.round((outfieldSlots * totalMatchMinutes) / outfieldCount);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-black text-lime-400">Pre-Match Strategy Planner</h1>

      {/* MATCH HALVES */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <label className="block text-xs font-bold text-lime-400 mb-2 uppercase tracking-wider">
          ⏱️ Match Duration ({props.halfMinutes}m halves = {totalMatchMinutes}m total)
        </label>
        <div className="flex gap-2">
          {[20, 25, 30, 35].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => props.handleHalfMinutesChange(mins)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                props.halfMinutes === mins
                  ? 'bg-lime-500 text-black border-lime-400'
                  : 'bg-black border-gray-800 text-gray-400'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* GOALKEEPER STRATEGY SELECTOR */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md flex flex-col gap-3">
        <div>
          <span className="text-xs font-black text-lime-400 block uppercase">🧤 Goalkeeper Rotation Strategy</span>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            Configure how goalkeepers share playing time between the net and outfield.
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => props.setGkStrategy('full')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
              props.gkStrategy === 'full' ? 'bg-lime-500 text-black border-lime-400' : 'bg-black border-gray-800 text-gray-400'
            }`}
          >
            FULL MATCH GK
          </button>
          <button
            type="button"
            onClick={() => props.setGkStrategy('half')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
              props.gkStrategy === 'half' ? 'bg-lime-500 text-black border-lime-400' : 'bg-black border-gray-800 text-gray-400'
            }`}
          >
            HALF & HALF GK
          </button>
          <button
            type="button"
            onClick={() => props.setGkStrategy('rotate')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
              props.gkStrategy === 'rotate' ? 'bg-lime-500 text-black border-lime-400' : 'bg-black border-gray-800 text-gray-400'
            }`}
          >
            FULL ROTATION
          </button>
        </div>

        {props.gkStrategy === 'half' && (
          <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
            <span className="text-gray-300 font-bold">2nd Half GK:</span>
            <select
              value={props.halfTwoGkId}
              onChange={(e) => props.setHalfTwoGkId(e.target.value)}
              className="bg-black border border-gray-800 text-lime-400 font-bold text-xs p-2 rounded-xl focus:outline-none flex-1 max-w-[200px]"
            >
              <option value="">Select 2nd Half GK</option>
              {activeSquad.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.squad_number} {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* FORMATION OPTIONS */}
      {props.activeFormations.length > 0 && (
        <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md flex justify-between items-center text-xs">
          <span className="text-gray-300 font-bold">Tactical Formation:</span>
          <select
            value={props.formationIndex}
            onChange={(e) => props.setFormationIndex(parseInt(e.target.value, 10))}
            className="bg-black border border-gray-800 text-lime-400 font-bold text-xs p-2 rounded-xl focus:outline-none"
          >
            {props.activeFormations.map((f, i) => (
              <option key={i} value={i}>{f.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* POSITION STARTERS */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold">
            📋 1. Select Position Starters ({Object.keys(props.starterMap).length}/{props.currentPitchCapacity})
          </h2>
          <button
            type="button"
            onClick={props.autoFillStarters}
            className="text-[10px] bg-lime-500/20 text-lime-400 border border-lime-500/40 px-2.5 py-1.5 rounded-lg font-bold hover:bg-lime-500 hover:text-black transition-all"
          >
            ⚡ AUTO-FILL STARTERS
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mb-4">
          {currentSlots.map((slot, idx) => (
            <div key={`${slot}-${idx}`} className="bg-black p-2.5 rounded-xl border border-gray-800 flex items-center justify-between gap-2">
              <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg shrink-0 min-w-[70px] text-center">
                {slot}
              </span>
              <select
                value={props.starterMap[slot] || ''}
                onChange={(e) => props.assignStarterToSlot(slot, e.target.value)}
                className="bg-gray-950 border border-gray-800 text-xs font-bold text-white p-2 rounded-xl flex-1 focus:outline-none focus:border-lime-400"
              >
                <option value="">Select Starter for {slot}</option>
                {activeSquad.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.squad_number} {p.name} ({p.preferred_position})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* SQUAD ATTENDANCE TOGGLES */}
        <div className="pt-3 border-t border-gray-800">
          <span className="text-[11px] font-bold text-gray-400 block mb-2 uppercase">Squad Attendance ({activeSquad.length}):</span>
          <div className="grid grid-cols-2 gap-2">
            {props.squad.map((player) => {
              const isAvailable = props.availablePlayerIds.includes(player.id);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => props.togglePlayerAvailability(player.id)}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    isAvailable
                      ? 'bg-black border-gray-800 text-white'
                      : 'bg-gray-950 border-gray-900 text-gray-600 line-through'
                  }`}
                >
                  <span className="truncate max-w-[110px]">#{player.squad_number} {player.name}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${isAvailable ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                    {isAvailable ? 'PRESENT' : 'ABSENT'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* EQUAL-PLAY AUTO CALCULATOR WITH INTERVAL & BATCH TUNING */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-lime-500/30 shadow-md flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-black">
            ⚡ 2. Equal-Play Auto Calculator
          </h2>
          <span className="text-[10px] bg-lime-500/20 text-lime-400 font-mono font-bold px-2 py-0.5 rounded">
            Target: ~{targetOutfieldMins}m / player
          </span>
        </div>

        {/* MULTI-SUB BATCH SIZE CONTROL */}
        <div className="bg-black p-3 rounded-xl border border-gray-800 text-xs flex flex-col gap-2">
          <span className="text-[11px] font-bold text-lime-400 uppercase">🔄 Players to Rotate Per Window (Batch Size):</span>
          <div className="flex gap-2">
            {[1, 2, 3].map((batch) => (
              <button
                key={batch}
                type="button"
                onClick={() => props.setSubsPerBatch(batch)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all ${
                  props.subsPerBatch === batch
                    ? 'bg-lime-500 text-black border-lime-400 shadow-md'
                    : 'bg-gray-900 text-gray-400 border-gray-800'
                }`}
              >
                {batch === 1 ? '1 Player' : `${batch} Players`}
              </button>
            ))}
          </div>
        </div>

        {/* ROTATION INTERVAL SELECTION */}
        <div className="bg-black p-3 rounded-xl border border-gray-800 text-xs flex flex-col gap-2">
          <span className="text-[11px] font-bold text-gray-300">Test Rotation Window (Minutes):</span>
          <div className="flex gap-1.5">
            {[5, 6, 7, 8, 10].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => props.setRotationIntervalMins(mins)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                  props.rotationIntervalMins === mins
                    ? 'bg-lime-500 text-black border-lime-400'
                    : 'bg-gray-900 text-gray-400 border-gray-800'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={props.handleGenerateMatchPlan}
          className="w-full bg-lime-500 text-black font-black p-3.5 rounded-xl text-xs active:scale-95 transition-all shadow-md min-h-[48px]"
        >
          ⚡ CALCULATE EQUAL PLAY PLAN
        </button>
      </div>

      {/* MANUAL SINGLE SUB STEP ENTRY */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <h2 className="text-xs font-black text-lime-400 uppercase tracking-wider mb-2">
          ➕ Add Manual Scheduled Sub Step
        </h2>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <select
              value={props.planOffPlayerId}
              onChange={(e) => props.setPlanOffPlayerId(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-white p-2.5 rounded-xl flex-1 focus:outline-none"
            >
              <option value="">Select OFF Player</option>
              {activeSquad.map((p) => (
                <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
              ))}
            </select>

            <select
              value={props.planOnPlayerId}
              onChange={(e) => props.setPlanOnPlayerId(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-lime-400 p-2.5 rounded-xl flex-1 focus:outline-none"
            >
              <option value="">Select ON Player</option>
              {activeSquad.map((p) => (
                <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={props.planMinute}
              onChange={(e) => props.setPlanMinute(parseInt(e.target.value, 10) || 1)}
              className="bg-black border border-gray-800 text-xs font-bold text-amber-400 p-2.5 rounded-xl w-20 text-center focus:outline-none"
              placeholder="Min"
            />

            <select
              value={props.planTargetPos}
              onChange={(e) => props.setPlanTargetPos(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-white p-2.5 rounded-xl flex-1 focus:outline-none"
            >
              {props.positionSlots.map((pos) => (
                <option key={pos} value={pos}>Target Pos: {pos}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={props.handleAddCustomSubStep}
              className="bg-lime-500 text-black font-black px-4 py-2.5 rounded-xl text-xs active:scale-95 transition-all"
            >
              + ADD
            </button>
          </div>
        </div>
      </div>

      {/* EDITABLE SCHEDULE PREVIEW BEFORE COMMIT */}
      {props.generatedPlan.length > 0 && (
        <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold">
              📋 3. Review & Adjust Rotation Schedule ({props.generatedPlan.length})
            </h2>
            <span className="text-[10px] text-gray-400">Reassign target pitch slot</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {props.generatedPlan.map((step) => (
              <div key={step.id} className="bg-black p-3 rounded-xl border border-gray-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-amber-400 font-mono font-bold">Min {step.minute}' — </span>
                    <span className="text-red-400 font-bold">OFF: {step.offPlayerName} </span>
                    <span className="text-lime-400 font-bold">ON: {step.onPlayerName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.handleRemoveSubStep(step.id)}
                    className="text-red-500 font-bold text-xs px-2 py-1"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-900">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Target Slot:</span>
                  <select
                    value={step.assignedPosition}
                    onChange={(e) => props.handleUpdateSubStepPosition(step.id, e.target.value)}
                    className="bg-gray-950 border border-gray-800 text-lime-400 font-bold text-xs p-1.5 rounded-lg flex-1 focus:outline-none"
                  >
                    {props.positionSlots.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos} Channel
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={props.handleCommitPlanToMatchday}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black p-4 rounded-2xl text-xs active:scale-95 transition-all shadow-lg min-h-[48px] mt-2"
          >
            🚀 COMMIT PLAN & GO TO MATCHDAY PITCH BOARD
          </button>
        </div>
      )}

      {/* PROJECTED MINUTES AUDIT BREAKDOWN */}
      {projectedList.length > 0 && (
        <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between">
            <span>📊 Projected Minutes Audit</span>
            <span>{totalMatchMinutes}m Total Match</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {projectedList.map((player) => (
              <div key={player.id} className="p-3 bg-black rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-300 truncate max-w-[100px]">
                  #{player.squad_number} {player.name}
                </span>
                <span className="font-mono font-extrabold text-lime-400 shrink-0">
                  {player.projectedMins}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}