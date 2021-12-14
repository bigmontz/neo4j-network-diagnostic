import { Button } from '@neo4j-ds/react';
import './App.css';
import '../node_modules/@neo4j-ds/base/lib/neo4j-ds-styles.css';
import React, { useEffect, useState, useRef } from 'react';
import neo4j from 'neo4j-driver-lite';

function App() {
  let [url, setUrl] = useState('bolt://localhost:7687');
  let [username, setUsername] = useState('neo4j');
  let [password, setPassword] = useState('pass');
  let [query, setQuery] = useState('RETURN 1');
  let [connectEnabled, setConnectEnabled] = useState(true);
  let [disconnectEnabled, setDisconnectEnabled] = useState(false);
  let [driver, setDriver] = useState(null);
  let [timeoutId, setTimeoutId] = useState(null);
  let connectEnabledRef = useRef(connectEnabled);
  let disconnectEnabledRef = useRef(disconnectEnabled);
  let driverRef = useRef(driver);
  let timeoutIdRef = useRef(timeoutId);

  useEffect(() => {
    connectEnabledRef.current = connectEnabled;
    disconnectEnabledRef.current = disconnectEnabled;
    driverRef.current = driver;
    timeoutIdRef.current = timeoutId;
  }, [disconnectEnabled, connectEnabled, driver, timeoutId]);
  

  function handleChange(setter) {
    return (event) => {
      setter(event.target.value);
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await stopWork();

    const newDriver = neo4j.driver(url, neo4j.auth.basic(username, password), {
      logging: {
        level: 'debug',
        logger: (level, message) => {
          console.log(`${level}: ${message}`);
        }
      }
    })
    
    setDriver(newDriver);

    await runQueryWhileDriverExists(newDriver);

    toggleConnect();
  }

  async function handleDisconnect(event) {
    event.preventDefault();
    await stopWork()
    toggleConnect();
  }

  async function stopWork() {
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      setTimeoutId(null);
    }
    if (driverRef.current !== null) {
      await driverRef.current.close();
      setDriver(null);
    }
  }

  async function runQueryWhileDriverExists(newDriver) {
    if (newDriver !== null) {
      try {
        let session = newDriver.session();
        let result = await session.readTransaction(tx => tx.run(query));
        await session.close();
        console.log(result);
        const id = setTimeout(async () => await runQueryWhileDriverExists(newDriver), 1000)
        setTimeoutId(id);
        return id;
      } catch (error) {
        console.error(error);
        stopWork();
        toggleConnect();
        return null;
      }
    }
  
    return null;
  }

  function toggleConnect() {
    setConnectEnabled(!connectEnabledRef.current);
    setDisconnectEnabled(!disconnectEnabledRef.current);
  }


  return (
    <div className="App">
      <header className="App-header">
        <h3>Network Diagnostic Tool</h3>
        <form onSubmit={handleSubmit}>
          <label for="url">Connect URL:</label>
          <input type="text" id="url" name="url" value={url} onChange={handleChange(setUrl)} />
          <label for="username">Username:</label>
          <input type="text" id="username" name="username" value={username} onChange={handleChange(setUsername)} />
          <label for="password">Password:</label>
          <input type="password" id="password" name="password" value={password} onChange={handleChange(setPassword)} />
          <label for="query">Query:</label>
          <input type="textarea" id="query" name="query" readOnly value={query} onChange={handleChange(setQuery)} />
          <Button type="submit" disabled={!connectEnabled}>Connect</Button>
          <Button color="secondary" disabled={!disconnectEnabled} onClick={handleDisconnect}>Disconnect</Button>
        </form>
      </header>

    </div>
  );
}

export default App;
