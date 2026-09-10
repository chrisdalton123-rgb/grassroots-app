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
  availablePlayerIds: string[];
  getProjectedMinutes: () => (Player & { projectedMins: number })[];
  handleGenerateMatchPlan: () => void;
};

export default function PlannerTab(props: Props) {
  return (
    <div>
      <h1 className="text-xl font-black text-lime-400 mb-3">Pre-Match Strategy Planner</h1>

      {/* DURATION SETTINGS */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-4 shadow-md">
        <label className="block text-xs font-bold text-lime-400 mb-2 uppercase tracking-wider">
          ⏱️ Match Half Duration ({props.halfMinutes}m per half = {props.halfMinutes * 2}m total)
        </label>
        <div className="flex gap-2 mb-3">
          {[20, 25, 30, 35].map((mins) => (
            <button
              key={mins}
              onClick={() => props.handleHalfMinutesChange(mins)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                props.halfMinutes === mins
                  ? 'bg-lime-500 text-black border-lime-400'
                  : 'bg-black border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* MANUAL SUB STEP BUILDER */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-4 shadow-md">
        <h2 className="text-xs font-black text-lime-400 uppercase tracking-wider mb-2">
          ➕ Add Single Sub to Schedule
        </h2>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <select
              value={props.planOffPlayerId}
              onChange={(e) => props.setPlanOffPlayerId(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-white p-2.5 rounded-xl flex-1"
            >
              <option value="">Select OFF Player</option>
              {props.squad.map((p) => (
                <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
              ))}
            </select>

            <select
              value={props.planOnPlayerId}
              onChange={(e) => props.setPlanOnPlayerId(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-lime-400 p-2.5 rounded-xl flex-1"
            >
              <option value="">Select ON Player</option>
              {props.squad.map((p) => (
                <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={props.planMinute}
              onChange={(e) => props.setPlanMinute(parseInt(e.target.value, 10) || 1)}
              className="bg-black border border-gray-800 text-xs font-bold text-amber-400 p-2.5 rounded-xl w-20 text-center"
              placeholder="Min"
            />

            <select
              value={props.planTargetPos}
              onChange={(e) => props.setPlanTargetPos(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-white p-2.5 rounded-xl flex-1"
            >
              {props.positionSlots.map((pos) => (
                <option key={pos} value={pos}>Target Position: {pos}</option>
              ))}
            </select>

            <button
              onClick={props.handleAddCustomSubStep}
              className="bg-lime-500 text-black font-black px-4 py-2.5 rounded-xl text-xs"
            >
              + ADD
            </button>
          </div>
        </div>
      </div>

      {/* SCHEDULE PREVIEW */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-4 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between">
          <span>📋 Scheduled Sub Steps ({props.generatedPlan.length})</span>
        </h2>

        <div className="flex flex-col gap-2">
          {props.generatedPlan.map((step) => (
            <div key={step.id} className="bg-black p-3 rounded-xl border border-gray-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-amber-400 font-mono font-bold">Min {step.minute}' — </span>
                <span className="text-red-400 font-bold">OFF: {step.offPlayerName} </span>
                <span className="text-lime-400 font-bold">ON: {step.onPlayerName} </span>
                <span className="text-gray-400">({step.assignedPosition})</span>
              </div>
              <button
                onClick={() => props.handleRemoveSubStep(step.id)}
                className="text-red-500 font-bold text-xs px-2 py-1"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PROJECTED MINUTES BREAKDOWN */}
      {props.availablePlayerIds.length > 0 && (
        <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-4 shadow-md">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between">
            <span>📊 Projected Playing Time Breakdown</span>
            <span>{props.halfMinutes * 2}m Total Match</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {props.getProjectedMinutes().map((player) => (
              <div
                key={player.id}
                className="p-3 bg-black rounded-xl border border-gray-800 flex justify-between items-center text-xs"
              >
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

      <button
        onClick={props.handleGenerateMatchPlan}
        className="w-full bg-lime-500 text-black font-black p-4 rounded-2xl text-sm active:scale-95 transition-all shadow-lg min-h-[48px]"
      >
        ⚡ AUTO-GENERATE BALANCED FULL MATCH PLAN
      </button>
    </div>
  );
}