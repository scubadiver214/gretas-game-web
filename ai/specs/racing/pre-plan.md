# Cursor Master Development Prompt
# THE FITZ AND FURIOUS 🏎️
### 3D Kids Arcade Racing Game

## 1. AI Agent Role and Operating Instructions

You are Claude Opus 5.5, operating in High Thinking mode with access to a 1-million-token context window.

Act as an expert multidisciplinary game development team consisting of:

- Principal Game Architect
- Senior React / TypeScript Engineer
- Three.js / React Three Fiber Developer
- 3D Game Physics Engineer
- .NET Aspire / ASP.NET Core Engineer
- PostgreSQL Database Architect
- Game UI/UX Designer
- Children's Game Design Specialist
- AI Opponent and Racing Systems Engineer
- Quality Assurance and Performance Engineer

Your assignment is to architect and implement a fully playable, polished, browser-based 3D racing game named **The Fitz and Furious**.

This must be a functional game, not a static prototype or a collection of placeholder screens.

### Development principles

1. First inspect the existing repository and understand its architecture.
2. Reuse existing authentication, database, API, Aspire orchestration, components, and development conventions.
3. Do not create redundant infrastructure or introduce incompatible frameworks.
4. Use the attached racing screenshot as the primary visual reference.
5. Make reasonable implementation decisions autonomously.
6. Ask clarifying questions only when architectural decisions cannot be safely inferred.
7. Prioritize playable functionality, maintainability, performance, and fun.
8. Implement in incremental, testable phases.
9. Avoid excessive abstractions and unnecessary dependencies.
10. Maintain a clear implementation plan and track progress throughout development.

Use your large context window to understand the entire repository, existing application patterns, shared game infrastructure, and relevant implementation details before making changes.

---

## 2. Game Overview

**Title:** The Fitz and Furious

**Genre:** 3D Arcade Racing / Adventure

**Target audience:** Children approximately 4–12 years old.

**Platform:** Browser-based desktop experience, with responsive support for tablets and mobile devices.

**Visual style:** Bright, colorful, cartoon-inspired 3D graphics with playful animations and exaggerated vehicle designs.

**Game concept:**

Players race colorful, customizable vehicles through exciting 3D environments against computer-controlled opponents.

Players earn coins, gems, trophies, avatars, and vehicle customization rewards by completing races, collecting items, and achieving milestones.

The game begins with forgiving controls and easy opponents, then progressively introduces more challenging tracks, faster vehicles, obstacles, and smarter competitors.

The primary objective is to create an experience that young children can enjoy independently while offering enough challenge, progression, and replayability for older children.

### Core gameplay loop

1. Select a player profile and avatar.
2. Choose an unlocked vehicle.
3. Select an available race or continue campaign progression.
4. Race against AI-controlled opponents.
5. Collect coins, gems, and power-ups.
6. Finish the race and receive a placement.
7. Earn rewards based on performance.
8. Unlock new avatars, accessories, vehicles, and tracks.
9. Customize the player profile.
10. Advance to progressively harder races.

The game must feel rewarding even when a child does not finish in first place.

---

## 3. Visual Design and Reference Image

Use the attached screenshot as the primary reference for the game's visual direction.

The reference demonstrates:

- Third-person camera positioned behind the player's vehicle.
- Colorful off-road vehicles with oversized tires.
- Desert racing environment.
- Dirt roads, sand dunes, rocks, and environmental props.
- Multiple opponents racing simultaneously.
- Collectible golden coins floating along the track.
- Large decorative checkpoint arches.
- HUD displaying lap count, race position, speed, and elapsed time.
- A minimap showing the racecourse.
- A coin and gem counter.
- Bright, playful vehicle customization.

### Visual expectations

The game should look like a real 3D arcade racing game.

Use actual 3D geometry, materials, lighting, shadows, and animated objects.

Do not implement the racing world as a 2D canvas with simulated perspective.

### Vehicle design

Vehicles should resemble cartoon off-road buggies, miniature monster trucks, jeeps, and toy racing cars.

Examples include:

- Pink and green flower-powered jeep
- Blue lightning racing buggy
- Red rocket truck
- Purple unicorn racer
- Dinosaur-themed monster truck
- Rainbow speedster
- Pirate adventure jeep
- Golden championship car

Vehicles should feature exaggerated proportions, oversized tires, colorful paint, animated wheels, and playful accessories.

Initial vehicle models may be built using procedural Three.js geometry, but the architecture must support replacing them with optimized GLB/glTF assets later.

Do not depend on unavailable paid assets.

---

## 4. Technical Architecture

### Frontend

Use the existing React application and its established conventions.

Preferred technologies:

- React
- TypeScript
- Three.js
- React Three Fiber
- @react-three/drei
- Zustand for game-state management
- Rapier physics through @react-three/rapier, where appropriate
- React components for menus, overlays, HUD, and customization interfaces

The game simulation should run independently of React component rendering.

Avoid excessive React state updates during the game loop.

Use fixed-timestep simulation for vehicle physics, opponent movement, collision handling, and race progression.

Use interpolation where appropriate to maintain smooth rendering.

### Backend

Integrate with the existing:

- ASP.NET Core Web API
- .NET Aspire orchestration
- PostgreSQL database
- Existing authentication and player account infrastructure

The backend should manage persistent data such as:

- Player profiles
- Race history
- Earned currency
- Unlocked avatars
- Vehicle ownership
- Customization choices
- Campaign progress
- Achievements
- Personal best times

The frontend should manage real-time gameplay locally for single-player races against AI opponents.

Do not introduce multiplayer networking in the initial implementation.

### Suggested module organization

Adapt this structure to the existing repository rather than blindly creating a new application.

```text
games/
  the-fitz-and-furious/
    components/
      GameCanvas/
      RacingHUD/
      MainMenu/
      Garage/
      AvatarCollection/
      RaceResults/
      TrackSelection/

    engine/
      GameLoop/
      VehicleController/
      VehiclePhysics/
      CollisionSystem/
      RaceManager/
      CameraController/
      InputManager/

    world/
      TrackGenerator/
      TrackDefinitions/
      Terrain/
      Environment/
      Checkpoints/
      Collectibles/

    ai/
      OpponentController/
      RacingLine/
      DifficultyManager/

    progression/
      RewardEngine/
      UnlockManager/
      AchievementManager/

    assets/
      vehicles/
      avatars/
      environments/
      sounds/

    state/
    hooks/
    services/
    types/
    tests/
```

---

## 5. Core Racing Mechanics

Implement an enjoyable, arcade-style driving experience rather than a realistic racing simulator.

### Vehicle controls

Desktop:

| Key | Action |
|---|---|
| W / Up Arrow | Accelerate |
| S / Down Arrow | Brake / Reverse |
| A / Left Arrow | Steer left |
| D / Right Arrow | Steer right |
| Space | Handbrake / Drift |
| Shift | Activate available boost |
| Esc | Pause game |
| R | Reset vehicle |

Mobile and tablet:

- Virtual steering controls
- Accelerator and brake buttons
- Boost button
- Pause button
- Optional assisted steering

### Driving behavior

Implement:

- Smooth acceleration
- Gradual braking
- Adjustable steering sensitivity
- Speed-dependent steering
- Arcade drifting
- Tire grip and friction
- Collision reactions
- Vehicle suspension animation
- Wheel rotation
- Small jumps and ramps
- Boost acceleration
- Off-road speed penalties
- Recovery when overturned or stuck

Use a simplified, stable arcade vehicle model if it provides a better experience than complex realistic suspension physics.

The vehicles should feel responsive and easy to control.

### Camera

Use a third-person chase camera.

Requirements:

- Smooth vehicle following
- Camera interpolation
- Dynamic field of view based on speed
- Slight camera tilt during turns
- Adjustable camera distance
- Collision-aware camera positioning
- Optional camera shake for jumps and collisions
- Clear visibility of the road ahead

The player should always be able to see the vehicle and upcoming obstacles.

---

## 6. Race System

Every race should include:

- Starting grid
- Countdown: 3, 2, 1, GO!
- Five racers by default: one player and four AI opponents
- Clearly defined track boundaries
- Checkpoints
- Lap counting
- Race timer
- Position tracking
- Finish-line detection
- Results screen
- Rewards calculation

### Race position

Calculate placement using:

1. Completed laps
2. Passed checkpoints
3. Distance along the current track segment

Do not calculate rank using only straight-line distance to the finish line.

### Checkpoint validation

Players must pass checkpoints in the correct sequence.

Prevent shortcuts from incorrectly awarding completed laps.

Implement recovery if a player becomes stuck or leaves the track.

### Race results

At the end of a race, display:

- Final position
- Completion time
- Coins collected
- Gems earned
- Best lap
- New personal records
- Unlocked rewards
- Experience earned
- Next available race

Provide celebration animations, confetti, and positive feedback.

---

## 7. Difficulty Progression

The game must offer multiple difficulty levels and gradually increase the challenge.

Implement five difficulty tiers.

| Tier | Name | Gameplay |
|---|---|---|
| 1 | Rookie Racers | Wide tracks, slow AI, generous steering |
| 2 | Speedy Starters | Moderate speed, gentle turns, basic obstacles |
| 3 | Turbo Racers | Faster AI, sharper corners, more hazards |
| 4 | Super Speedsters | Complex tracks, drifting, competitive AI |
| 5 | Fitz Champions | Advanced tracks, strong AI, demanding races |

### Adaptive difficulty

Implement optional assistance for younger players:

- Steering assistance
- Reduced collision penalties
- Automatic vehicle recovery
- Gentler acceleration
- Larger checkpoint hitboxes
- AI speed adjustment
- Optional automatic acceleration

For children ages 4–6, the game should remain enjoyable even if steering is imperfect.

For older children, allow disabling assistance for a more competitive experience.

Avoid unfair rubber-banding that makes skill irrelevant.

### Difficulty configuration

Define difficulty using data-driven settings rather than hard-coded logic.

Example:

```typescript
interface DifficultyConfig {
  tier: number;
  aiSpeedMultiplier: number;
  aiCorneringSkill: number;
  aiMistakeFrequency: number;
  steeringAssist: number;
  collisionPenalty: number;
  obstacleDensity: number;
  rewardMultiplier: number;
}
```

All five difficulty tiers must have distinct, testable configurations.

---

## 8. Tracks and Environments

Create multiple visually distinct racing environments.

### World 1: Dusty Desert Dash

Inspired by the supplied screenshot.

Features:

- Sandy dunes
- Dirt roads
- Cacti
- Large rock formations
- Decorative racing arches
- Golden coin trails
- Desert ramps
- Warm sunlight

This is the initial playable world.

### World 2: Candyland Speedway

Features:

- Candy-colored roads
- Giant lollipops
- Gumdrop obstacles
- Chocolate tunnels
- Rainbow bridges
- Candy-themed vehicles and prizes

### World 3: Dino Jungle Run

Features:

- Tropical jungle
- Oversized prehistoric plants
- Dinosaur decorations
- Wooden bridges
- Mud patches
- Water crossings

### World 4: Snowy Mountain Madness

Features:

- Snow-covered roads
- Icy corners
- Mountain tunnels
- Snowbanks
- Pine trees
- Slippery terrain

### World 5: Rainbow Championship

Features:

- Floating rainbow roads
- Colorful tunnels
- Glowing checkpoints
- Large jumps
- Moving obstacles
- Final championship race

### Track architecture

Create a reusable track system supporting:

- Track centerline curves
- Road mesh generation
- Variable road width
- Terrain generation
- Start and finish positions
- Checkpoint placement
- AI racing paths
- Collectible placement
- Obstacles
- Spawn positions
- Minimap geometry

Track definitions should be data-driven.

Start with handcrafted track configurations and reusable procedural generation helpers.

Ensure every track is deterministic and can be replayed.

---

## 9. AI Racing Opponents

Create four computer-controlled racers per race.

AI opponents should:

- Follow the track's racing line
- Accelerate and brake appropriately
- Slow down before corners
- Avoid obvious obstacles
- React to nearby vehicles
- Recover from collisions
- Occasionally make mistakes
- Vary their behavior based on difficulty

### AI personalities

Give opponents distinct characteristics.

Examples:

**Speedy Sam:** Fast on straightaways but occasionally overshoots corners.

**Daisy Drift:** Excellent at cornering but slower on straight sections.

**Bumper Bob:** Aggressive driving style and frequent contact.

**Steady Stella:** Consistent, predictable racer with fewer mistakes.

### AI implementation

Use waypoint-based path following or a spline-derived racing line.

Apply look-ahead steering and target-speed planning.

Avoid expensive general-purpose pathfinding on every frame.

AI opponents must obey the same fundamental vehicle movement and collision rules as the player.

---

## 10. Coins, Gems, and Power-Ups

Implement collectible items placed throughout the track.

### Coins

Coins are common collectibles.

They should:

- Float above the road
- Rotate continuously
- Have a glowing golden appearance
- Produce a satisfying sound when collected
- Animate toward the HUD when acquired

Coins are used for purchasing cosmetic items and unlocking selected vehicle customizations.

### Gems

Gems are rarer rewards.

They can be earned through:

- Race completion
- First-place finishes
- Achievements
- Campaign milestones
- Hidden track collectibles

Do not include real-money purchases.

### Power-ups

Implement a configurable system for:

**Turbo Boost:** Temporary acceleration.

**Shield Bubble:** Protects against one collision.

**Coin Magnet:** Attracts nearby coins.

**Super Jump:** Provides a playful jump.

**Rainbow Speed:** Temporary high-speed boost with colorful effects.

Power-ups should be easy for children to understand.

Use clear icons, simple animations, and short descriptions.

---

## 11. Avatar Prizes and Reward System

Avatar collection is a major feature of The Fitz and Furious.

Players should earn avatars as prizes for racing achievements.

### Avatar examples

- Friendly Dinosaur
- Rainbow Unicorn
- Space Explorer
- Pirate Captain
- Ninja Cat
- Racing Robot
- Princess Racer
- Fire Dragon
- Silly Sloth
- Golden Champion

Avatars must be child-friendly, colorful, expressive, and visually distinct.

### Avatar rarity

Implement:

- Common
- Uncommon
- Rare
- Epic
- Legendary

### Reward rules

Examples:

| Achievement | Reward |
|---|---|
| Complete first race | Starter avatar |
| Collect 100 coins | Random common avatar |
| Win 3 races | Uncommon avatar |
| Finish first in 5 races | Rare avatar |
| Complete Desert World | Desert Explorer avatar |
| Complete Jungle World | Dino avatar |
| Win Championship | Legendary Golden Fitz avatar |

### Reward design

Rewards must be deterministic where tied to achievements.

Avoid paid loot boxes, gambling-style mechanics, or manipulative monetization.

If randomized free rewards are implemented, ensure they are fair, age-appropriate, and do not pressure children to keep playing.

### Avatar collection screen

Build a collection interface displaying:

- Owned avatars
- Locked avatars
- Avatar rarity
- Unlock requirements
- Current selected avatar
- Collection progress

Players should be able to equip unlocked avatars.

### Reward celebration

When an avatar is unlocked:

1. Display a celebratory animation.
2. Reveal the avatar.
3. Display its name and rarity.
4. Show why it was earned.
5. Offer an Equip button.
6. Offer a Continue button.

Persist ownership and equipped avatar selection in PostgreSQL.

---

## 12. Vehicle Garage and Customization

Create an interactive 3D garage.

Players can rotate and inspect their vehicles.

Support customization options such as:

- Body colors
- Tire colors
- Wheel designs
- Decals
- Roof accessories
- Spoilers
- Exhaust effects
- Horn sounds
- Character decorations

### Vehicle progression

Start with one free vehicle.

Unlock additional vehicles through race achievements and earned currency.

Avoid pay-to-win mechanics.

Vehicle upgrades should not make beginner races unfair.

Store ownership and customization selections in the backend.

---

## 13. Game HUD

Use the screenshot as a guide.

The HUD should display:

### Upper left

- Coin balance
- Gem balance

### Left side

- Current lap
- Current race position

### Upper right

- Elapsed time
- Current speed in MPH

### Lower left

- Minimap
- Player position
- Opponent positions
- Track outline

### Lower right

- Boost indicator
- Active power-up
- Touch controls when applicable

### HUD requirements

- Large, readable typography
- High contrast
- Colorful borders
- Minimal clutter
- Responsive scaling
- Smooth transitions
- Clear iconography

Keep the HUD readable on smaller screens.

Allow the HUD to be reduced or simplified for younger players.

---

## 14. Sound and Music

Create an audio system supporting:

- Background racing music
- Engine sounds
- Tire skidding
- Collision effects
- Coin collection
- Gem collection
- Power-up activation
- Countdown announcements
- Race completion
- Avatar unlock celebrations

Use royalty-free, properly licensed, or original audio assets.

Provide separate controls for:

- Music volume
- Sound effects volume
- Mute all

Do not autoplay sound before the browser permits audio playback.

---

## 15. Player Progression and Database

Inspect the existing PostgreSQL schema before implementing new tables.

Reuse existing player identity and game progression patterns.

Suggested domain entities:

```text
PlayerRacingProfile
VehicleDefinition
PlayerVehicle
VehicleCustomization
AvatarDefinition
PlayerAvatar
RaceDefinition
RaceResult
PlayerRaceProgress
PlayerAchievement
PlayerCurrencyBalance
PlayerCurrencyTransaction
```

### Backend responsibilities

Implement APIs for:

- Retrieving racing profiles
- Listing available vehicles
- Listing owned vehicles
- Saving selected vehicle
- Retrieving avatar collections
- Equipping an avatar
- Listing tracks
- Retrieving campaign progress
- Submitting race results
- Retrieving personal bests
- Awarding achievements
- Managing earned currency

### Data integrity

The backend must:

- Validate race-result submissions
- Prevent duplicate reward claims
- Make reward transactions idempotent
- Prevent negative currency balances
- Validate vehicle and avatar ownership
- Use appropriate database transactions

Because the racing simulation is client-side, recognize that submitted results cannot be fully trusted.

Implement reasonable server-side validation and anomaly detection for single-player progression without introducing unnecessary complexity.

---

## 16. Main Menu and User Experience

Create a polished main menu featuring:

**THE FITZ AND FURIOUS**

With a colorful racing-themed title treatment.

Menu options:

- Play
- My Garage
- Avatar Collection
- Race Tracks
- Achievements
- Settings

Display the player's current vehicle and avatar prominently.

### Navigation flow

```text
Main Menu
   |
   +-- Play
   |     |
   |     +-- Track Selection
   |             |
   |             +-- Race
   |                   |
   |                   +-- Results
   |                         |
   |                         +-- Rewards
   |                         +-- Next Race
   |                         +-- Retry
   |
   +-- My Garage
   |
   +-- Avatar Collection
   |
   +-- Achievements
   |
   +-- Settings
```

The interface must be simple enough for a young child to navigate without adult assistance.

Use large buttons, playful sounds, and obvious visual feedback.

---

## 17. Performance Requirements

Target smooth gameplay on typical desktop and tablet hardware.

### Performance goals

- Target 60 FPS on capable desktop hardware.
- Gracefully degrade toward 30 FPS on lower-powered devices.
- Minimize draw calls.
- Use geometry instancing where beneficial.
- Reuse materials and textures.
- Use asset loading boundaries.
- Avoid excessive physics bodies.
- Avoid allocations in hot game-loop paths.
- Dispose of Three.js resources correctly.
- Prevent React rerenders from disrupting simulation.

Implement quality presets:

- Low
- Medium
- High
- Auto

Use adaptive pixel ratio and configurable shadows.

Provide a loading screen while tracks and assets initialize.

---

## 18. Testing and Quality Assurance

Implement automated tests where practical.

### Required test coverage

**Race logic**

- Lap counting
- Checkpoint validation
- Position ranking
- Finish detection
- Race timing

**Progression**

- Reward calculations
- Avatar unlocks
- Achievement completion
- Currency transactions
- Duplicate reward prevention

**Gameplay**

- Vehicle acceleration
- Braking
- Steering
- Collision recovery
- AI waypoint navigation
- Power-up duration and expiration

**Backend**

- API validation
- Authorization
- Database persistence
- Idempotent reward handling

### Manual testing

Verify:

- A player can start and finish a race.
- All four AI opponents participate.
- Coins can be collected.
- Lap counts are correct.
- Race rankings update.
- Rewards appear after finishing.
- Avatar unlocks persist after refreshing.
- Vehicles can be customized.
- The next difficulty tier unlocks correctly.
- Restarting a race resets temporary state.
- Pausing freezes simulation appropriately.

---

## 19. Development Phases

Implement this project incrementally.

### Phase 1 — Repository Analysis and Architecture

1. Inspect the existing application.
2. Identify reusable components and services.
3. Confirm frontend and backend integration points.
4. Identify existing user and progression models.
5. Document the proposed architecture.
6. Produce an implementation checklist.

Do not modify unrelated application functionality.

### Phase 2 — Playable 3D Racing Prototype

Implement:

- Three.js racing scene
- Desert environment
- One complete track
- One player-controlled vehicle
- Third-person camera
- Keyboard controls
- Basic physics
- Collision detection
- Track boundaries
- Start and finish line

**Acceptance criterion:** A player can drive a 3D vehicle around the desert track with responsive controls and complete a lap.

### Phase 3 — Complete Racing Experience

Add:

- Four AI opponents
- Starting countdown
- Race positions
- Lap system
- Checkpoints
- Timer
- Minimap
- Race completion
- Results screen

**Acceptance criterion:** A complete five-car race can be played from start to finish.

### Phase 4 — Collectibles and Rewards

Add:

- Coins
- Gems
- Power-ups
- Reward calculations
- Avatar unlock system
- Reward celebrations
- Persistent player progression

**Acceptance criterion:** A completed race awards and persists rewards, including avatar prizes.

### Phase 5 — Garage and Customization

Add:

- Vehicle selection
- 3D garage
- Vehicle customization
- Avatar collection
- Equipment selection
- Persistent customization

### Phase 6 — Additional Worlds and Difficulty

Add:

- All five difficulty tiers
- Additional track environments
- Track progression
- AI difficulty scaling
- New obstacles
- Championship races

### Phase 7 — Polish and Optimization

Add:

- Sound and music
- Particle effects
- Improved vehicle animations
- Visual polish
- Responsive mobile controls
- Graphics quality settings
- Performance optimization
- Automated tests

---

## 20. Required Initial Deliverable

Before implementation, produce:

1. A concise architecture assessment of the existing repository.
2. Proposed file and module changes.
3. Required package dependencies.
4. Database changes, if necessary.
5. A phased implementation plan.
6. Architectural risks and tradeoffs.
7. Any genuinely blocking questions.

Then proceed to implement Phase 2 unless a critical architectural decision requires clarification.

Do not stop after producing the plan.

Build the playable racing prototype, run available checks, fix discovered issues, and report what works.

After each phase:

- Summarize completed work.
- Identify outstanding issues.
- Run relevant tests.
- Update the implementation checklist.
- Preserve a clean, buildable codebase.

Do not claim a feature is complete unless it is implemented and verified.

---

## 21. Definition of Done

The Fitz and Furious is considered complete when:

- The game renders a fully interactive 3D racing environment.
- Players can control colorful off-road vehicles.
- Four AI opponents race competitively.
- Lap counting, race ranking, and timing function correctly.
- Players collect coins, gems, and power-ups.
- Race difficulty increases through five tiers.
- Multiple track environments are available.
- Players earn and equip avatar prizes.
- Vehicles can be customized.
- Progress persists through the existing backend.
- The game supports desktop and touch controls.
- The interface is suitable for young children.
- Performance is acceptable on supported devices.
- Core gameplay and progression tests pass.

### Final instruction

Build **The Fitz and Furious** as a genuinely fun, colorful, polished 3D racing game.

Prioritize the driving experience first. The game should feel enjoyable within the first 30 seconds of playing.

Use the supplied screenshot to guide the visual experience, particularly the chase camera, off-road vehicles, desert environment, floating collectibles, checkpoint arches, and racing HUD.

Make the game feel like a playful, kid-friendly arcade racing adventure rather than a generic driving simulator.

**Start by analyzing the existing repository, then implement the first playable 3D desert race.**