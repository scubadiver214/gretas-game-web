# Character models

`boy.glb` ("Adventurer", Ultimate Modular Men Pack) and `girl.glb` ("Hooded Adventurer",
Ultimate Modular Women Pack) are by [Quaternius](https://quaternius.com/), downloaded from
[poly.pizza](https://poly.pizza/u/Quaternius) and released under
[CC0 1.0 (Public Domain)](https://creativecommons.org/publicdomain/zero/1.0/).

Modifications: unused animation clips were removed, the boy's backpack was removed, and
unreferenced data pruned with `@gltf-transform/functions` (`dedup`, `prune`) to shrink the
files. The girl's sword is reused at runtime as the sword on both characters' backs.
Remaining clips (both files):

- Idle, Idle_Neutral, Walk, Run, Wave, Interact
