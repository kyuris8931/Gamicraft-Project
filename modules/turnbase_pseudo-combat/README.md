# Gamicraft - Turn-Based Combat (TBC) Module

**Version:** 0.1.0 (Alpha) **Status:** In Development & Testing

## Overview

This is the Turn-Based Combat (TBC) module for the Gamicraft framework. It provides fast-paced, strategic battle sessions where you command a team of Heroes against various enemies. This module is an AutoTools Web Screen, powered by Tasker on Android.

## Key Features & Mechanics

- **Fast-Paced, High-Impact Combat:** Battles are designed to be quick and engaging. Every action matters, with a focus on resource management and strategic decision-making.
    
- **Pseudo-Position System:** A unique, gridless combat field. Unit positions are relative to the active character (e.g., `+1` for the unit in front, `-1` for the unit behind), simplifying targeting for abilities like "cleave," "pierce," and "radius" attacks.
    
- **Shared SP (Skill Points) Pool:** Your team shares a single pool of SP. Basic Attacks are your primary way to randomly generate SP (1-5 per attack), while powerful skills consume it. Managing this resource is key to victory.
    
- **Three-Skill System (for this Alpha):** Each Hero comes equipped with:
    
    1. **Basic Attack:** Your reliable SP generator.
        
    2. **Three Active Skills:** Unique abilities with varying SP costs that allow for diverse tactical options, from single-target bursts to area-of-effect damage.
        
- **Dynamic Turn Order:** The turn order for all units (allies and enemies) is randomized at the start of each round, keeping every round unpredictable and challenging.
    

This alpha version serves to test the core gameplay loop. Future versions will introduce more complex mechanics like Gauge, Ultimates, Status Effects, and more.