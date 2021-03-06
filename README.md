# Discontinued!
Due to having to rewrite the app for Homey 2.0 and SDK2, I am discontinuing this app for now.

# MusicBee Remote
Ok Homey! Play me something!

Control MusicBee with your Homey! This plugin allows you to send commands through the [MusicBee Remote plugin by Kelsos](http://kelsos.net/musicbeeremote/). Uses devices so you can control multiple MusicBee instances!

## You can:
* Get track information such as artist, album, title, lyrics and more
* Play/Pause/Stop music
* Stop music after the current track has finishing playing
 * And trigger a flow when this happened
* Play Next / Previous track
* Change volume
* Toggle repeat
* Toggle shuffle and Auto DJ
* Change track rating

## You can not yet:
* Start playlists
* Get album art (as Base64 string or url)
* Seek in track

## I might add (if people actually use this app):
* Search, queue and start tracks, artists and albums
* Start music from url's
* Transfer playlist content to variable or Homey playlist system
* Trigger with track progress tags (so you can run your own timers with the Countdown app)


# Flow cards explained
## Triggers
![Track changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-track_changed.png)

Triggers when track changes automatically or by skipping to the next track

Provides tags:
* Track title
* Artist name
* Album name
* Album year
* Rating from 0-5 in 10 steps
* Track lyrics
* Track length in seconds


![Playback state changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-state_changed.png)

Triggers when playback has been paused, stopped or started

Provides tag:
* State
 * Can be 'Playing', 'Paused' or 'Stopped'

![Track rating changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-rating_changed.png)

Provides tag:
Triggers when track rating has been changed
* Rating from 0-5 in 10 steps

![Volume changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-volume_changed.png)

Triggers when MusicBee volume has been changed (combines volume changes that happen less then 500ms appart)

Provides tag:
* Volume from 0-100

![Shuffle state changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-shuffle_changed.png)

Triggers when the MusicBee shuffle setting is changed

Provides tag:
* State
 * Can be 'shuffle', 'off' or 'autodj'

![Mute state changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-mute_changed.png)

Triggers when Mute is enabled or disabled. Also triggers when volume equals zero

Provides tag:
* State
 * Can be 'true' or 'false'

![Repeat state changed trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-repeat_changed.png)

Triggers when MusicBee repeat setting is changed

Provides tag:
* State
 * Can be 'All', 'One' or 'None'

![MusicBee connected trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-connected.png)

![MusicBee disconnected trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-disconnected.png)

Triggers when Homey gets connected or disconnected to MusicBee (e.g. you started or close MusicBee)

![MusicBee 'stopped after current track' trigger](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/trigger-stopped_after_current.png)

A special trigger card.
Triggers when the 'Stop after current track' *action card* did his work. Triggers immediately when playback state is 'Paused' or 'Stopped' when the action card is executed.<br>
Note: This card does not get triggered by the 'stop after current track' option in *MusicBee itself*!


## Condition cards

![MusicBee is active condition](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/condition-active.png)

Whether Homey has an active connection to MusicBee at the moment

![Playback state condition](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/condition-playing.png)

![MusicBee is muted condition](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/condition-muted.png)

![Repeat state condition](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/condition-repeat.png)

![Shuffle state condition](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/condition-shuffle.png)

## Action cards

![Start playback action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-play.png)

![Pause playback action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-pause.png)

![Toggle Play / Pause action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-play_pause.png)

![Stop playback action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-stop.png)

![Start playback after current track action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-stop_finish.png)

Stop playback but finish currently playing track first. Works together with the *'stopped after current track'* trigger card.
Changing playback position in a track or changing track is taken into account. After the new track is finished, playback will still stop.
To cancel this state, execute the 'Play' action card. Hitting 'Play' in MusicBee or the MusicBee Remote Android app does not cancel this state!<br>
Note: Does not touch the 'stop after current track' option in *MusicBee itself*! They might bite :)

![Play next track action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-next.png)

![Play previous action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-previous.png)

![Set rating action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-set_rating.png)

![Set shuffle mode action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-set_shuffle.png)

![set repeat mode action](https://raw.githubusercontent.com/Joolee/nl.joolee.homey.musicbee/master/readme/action-set_repeat.png)

The MusicBee Remote plugin currently does not support setting repeat to 'One'.

# Changelog

V1.0 - 2016-10-20
* Enjoy :)

















