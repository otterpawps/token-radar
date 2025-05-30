<img src="https://github.com/user-attachments/assets/f43c82fc-0a8e-41ec-a971-1d2a8ab34338" width="75%"/>

![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v12%2B-orange)
![GitHub release (latest)](https://img.shields.io/github/v/release/otterpawps/token-radar)
![License](https://img.shields.io/badge/license-MIT-yellow)

# Token Radar (for Lancer GS)
Radar system for Lancer in Foundry v12
Disclaimer: I am pretty new to lancer/foundry so if I get game system rules incorrect please let me know asap.

**What does it do?** It adds a green radar scope to the top right of your screen (default, can easily be moved). The radar will dynamically show blips of other 'tokens/characters' around you. 
Currently the Radar will describe via color coding: Friendly, Unknown, and Hostile tokens. These are definable via default methods in foundry. It has 2 Range settings, using the Lancer system and manual. Check the box to use the lancer system and it will auto detect the token's SENSOR stat and make that the max range of the Radar. Or you can set it to manual and set your max range.

![image](https://github.com/user-attachments/assets/faf310fc-2a80-4c2e-a1e3-e71bef62a91c)

(see to do list for planned features). 

**Why use it?** Built specifically to expand the theatre of the mind to the vtt in Foundry. My friend's and I play this as a milsim and wanted visual features to sort of immerse ourselves with things like dynamic vision per token and of course a Radar system to describe what we can detect without as much abstraction from the GM.

**How to Use it?** 
- Move it with click and drag, it remembers where you put it between game sessions.
- To open Settings just double click the Radar!
- Clicking on tokens gives you view of their Radar (need to test and make this GM controlled/view).
- Updates with movement † of tokens.
- For your own custom gradient, it's CSS. Use your favorite css generator or just replace the existing RGBA.

**To Do List:**
- Statuses effecting Radar
- Improve visuals
- † - Need to make it update with click and drag movement.
- Include blip sizes based on token size
- Improve dynamic update on Radar
- Include more controls from GM to Player
- ~~Make 3 range rings with labels~~
- ~~Include color picker~~
