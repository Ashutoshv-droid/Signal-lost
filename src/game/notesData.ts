/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoreNote } from './types';

export const LORE_NOTES: LoreNote[] = [
  {
    id: 'note-01-cryo',
    x: 620,
    y: 260,
    title: 'LOG 01 // THEY ARE WEARING OUR FACES',
    author: 'Dr. Alan Vance, Xenobiology lead',
    timestamp: 'DAY 14 — 03:41 REE',
    body: `If anyone finds this slate... do not touch the bodies. 
Miller thought he was inspecting Jenkins slumped against the locker. Jenkins's ribs cracked open like a bear trap and swallowed Miller's arm whole before he could even scream.

These things—we call them MIMICS—resemble lifeless crew corpses until you step within arm's reach. They even mimic our radio whispers: 'Help me... please...' It's bait. Stay clear of motionless bodies.

HINT: I dropped the Sector Alpha Blue Keycard on the northern maintenance desk across the partition before the air-gate sealed.`,
    hint: 'Sector Alpha Keycard is resting on the northern maintenance desk.',
    collected: false,
  },
  {
    id: 'note-02-vents',
    x: 1350,
    y: 920,
    title: 'LOG 02 // SKITTERING IN THE CEILING DUCTS',
    author: 'Chief Engineer Maya Patel',
    timestamp: 'DAY 16 — 11:18 REE',
    body: `The Crawlers have taken over the ventilation grid. Eight-legged titanium horrors, razor mandibles dripping with coolant and human marrow. 

You can hear them tapping on the tin grates right above your skull seconds before they drop down behind you. If you hear metal scratching in the ceiling, crouch and freeze, or sprint into a locker before they emerge.

HINT: The Sub-Reactor circuit junction at Sector Beta must be recalibrated to bypass the secondary power locks on the highway.`,
    hint: 'Recalibrate the Sub-Reactor conduit in Sector Beta to unlock the highway gates.',
    collected: false,
  },
  {
    id: 'note-03-oculus',
    x: 1820,
    y: 420,
    title: 'LOG 03 // THE WATCHER’S SHRIEK',
    author: 'Surveillance Officer Kane',
    timestamp: 'DAY 17 — 19:04 REE',
    body: `Do not shine your tactical beam at the Oculus drones! 
They are bio-mechanical surveillance eyes floating in the high shafts. If light hits their bloodshot retinas, their iris expands, they scream at 140 decibels, and every Sentinel robot within three sectors converges on your position to tear you apart.

If one corners you, they will lunge with jagged mandibles. Cut your flashlight immediately when you hear their wet hum.

HINT: The Security Console in Sector Gamma holds an optical jammer that can disable Watcher feeds.`,
    hint: 'Kill your flashlight when Oculus Watchers approach; use EMP flares if spotted.',
    collected: false,
  },
  {
    id: 'note-04-warden',
    x: 2950,
    y: 350,
    title: 'LOG 04 // TEAM BRAVO WAS PULVERIZED',
    author: 'Security Chief Ramos',
    timestamp: 'DAY 19 — 04:55 REE',
    body: `Team Bravo emptied three magazines into the Warden guarding the vault corridor. The kinetic rounds bounced off its chassis like pebbles. It took Davis by the skull and drove him through reinforced concrete until nothing but red paste remained.

Throwing noise distractions at the Warden is suicide—its heuristic core ignores ordinary debris. You cannot distract it with junk. You must find an alternate route through the maintenance vents or strike with an EMP charge to buy seconds.

HINT: The Commander’s inner vault in Sector Delta holds the Master Red Keycard, but the Warden guards the blast corridor.`,
    hint: 'The Warden is immune to thrown distractions; use maintenance vents to flank it.',
    collected: false,
  },
  {
    id: 'note-05-glitch',
    x: 1600,
    y: 2300,
    title: 'LOG 05 // REALITY CORRUPTION & THE SHUTTLE',
    author: 'Dr. Elena Rostova, Last Survivor',
    timestamp: 'DAY 21 — 01:12 REE',
    body: `My radio is screaming white noise. It’s here—the Glitch. It doesn't walk; it phases through steel bulkheads, causing the facility strobes to burst and electrical dials to spin backwards. When you hear chaotic audio screeching, run the other way before it manifests in your space.

I managed to lock the Master Keycard in the safe desk. The evacuation shuttle at Sector Omega is fueled. If anyone is still breathing... disengage the airlock and burn this station to ashes.`,
    hint: 'Retrieve the Red Keycard from the vault safe, then breach Sector Omega to initiate launch.',
    collected: false,
  },
];
