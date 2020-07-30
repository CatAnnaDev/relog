module.exports = function Relog(mod) {
  let characters = []
  let position = -1

  mod.command.add('relog', arg => {
    if (!mod.game.me.alive) {
      mod.command.message(`isn't state you can relog`)
      return
    }

    if (arg === 'nx') {
      if (++position > characters.length)
        position = 1
    } else if (/^\d+$/.test(arg)) {
      const nextPosition = Number(arg)
      if (nextPosition > characters.length)
        return mod.command.message(`Not found ${nextPosition}th character`)
      else
        position = nextPosition
    } else {
      const found = characters.find(char => char.name.toLowerCase() === arg.toLowerCase())
      if (found)
        position = found.position
      else
        return mod.command.message(`Not found '${arg}'`)
    }

    relog()
  })

  // Grab the user list the first time the client sees the lobby
  mod.hook('S_GET_USER_LIST', 18, event => {
    characters = event.characters
  })

  // Keep track of current char for relog nx
  mod.hook('C_SELECT_USER', 1, event => {
    position = characters.find(char => char.id === event.id).position
  })
  
  function relog() {
    mod.send('C_RETURN_TO_LOBBY', 1, {})
    let prepareLobbyHook, lobbyHook
    // make sure that the client is able to log out
    prepareLobbyHook = mod.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
      mod.send('S_RETURN_TO_LOBBY', 1, {})

      // the server is ready to relog to a new character
      lobbyHook = mod.hookOnce('S_RETURN_TO_LOBBY', 1, () => {
        setImmediate(() => {
          mod.send('C_SELECT_USER', 1, { id: characters.find(char => char.position === position).id })
        })
      })
    })

    // hook timeout, in case something goes wrong
    setTimeout(() => {
      for (const hook of [prepareLobbyHook, lobbyHook])
        if (hook)
          mod.unhook(hook)
    }, 16000)
  }
}
