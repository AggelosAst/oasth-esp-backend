# Oasth backend for the esp bus tracker using [OasthWrapper](https://github.com/AggelosAst/oasthwrapper/tree/master)

## WARNING: There is some functionality removed in the websocket data as its too large for an esp32 to handle. However, you can make any additions or configurations to it.




### Core Features

Can track every bus for a single line aswell as timings such as arrival date and start date
Can track its actual location in the world (Latitude and Longtitude)
Can calculate the distances between every bus stop in a custom range (Default: 300m) from the bus in a route and find the closest one / current one or the next one.
Can figure out whether the route the bus you've been tracking has ended (the bus has arrived to its destination)

## General Features

Websocket integration not for just the esp32 but also for everyday use such as a website, a discord bot.
Entirely Customizable

### Visuals

This backend integrates a graph for every bus route completed for a **Line** and its **Direction** (Return | Arrival)
