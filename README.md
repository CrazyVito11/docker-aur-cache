# Docker AUR Cache
Docker image that automatically builds AUR packages and hosts them for faster installation on client devices.


## Why?
> "Why not just use an AUR helper to build the packages for you?"
>
> _- Probably you_

While AUR helpers can make it easier to manage your AUR packages, it does mean that you have another package manager that you have to run every once in a while to update your AUR packages. Which could result in you having to run 2 commands to update your system.

Some AUR packages can also be quite complex, taking a while to compile, which you have to sit through every time you want to update your system.

This Docker container was made to compile these AUR packages beforehand, and then provide them in such a way so that pacman can install those AUR packages directly, without needing AUR helpers or other build tools on your machine.
This can also be extra beneficial if you have multiple computers running Arch Linux, as then you only have to compile the packages once for all those machines.


## Architecture & Security
This project consists of 2 core components, the build manager and builder.

The build manager is responsible for managing the builder container, this includes building a new up-to-date version of that builder each time we want to build the package. This makes sure we are running a up-to-date "Arch" installation for each build we want to perform.

The builder is responsible for actually cloning and building the AUR package, including all required dependencies of that AUR package.
This container is thrown away and restarted for each AUR package you have configured, so each AUR build is performed in a clean environment.

Because the builder container is thrown away after each build, it should also be pretty safe against malicious packages trying to compromise the build server. Just make sure to keep your Docker engine up-to-date to protect against potential Docker engine escape vulnerabilities.

> [!WARNING]
> Please note that if you build a malicious package, it will still be served by the server and could then be installed by a client, compromising that client.
>
> You should still proceed with caution when adding new AUR packages and keep up with Arch Linux news.

The build manager also imposes certain limits to the builder.
If the builder gets stuck on a package, it will eventually be forcefully killed by the build manager once the maximum time has expired.

This not only prevents a build from unnecessarily consuming resources, it can also automatically clean up packages that intentionally cause this _(crypto miners for example)_.
If a builder consumes too much RAM and the system starts running out of memory, we have configured the OOM score to be very high, making it likely the builder will be killed instead of something else on the server.

Direct communication from the builder to the build manager isn't possible for security reasons, and in case somehow the builder could access the build manager, we have limited the Docker socket to only the bare minimum we need to limit the attack surface.

The only method the builder can use to pass results to the build manager, is to use the shared Docker volume, which it uses to pass the compiled packages back to the manager.
Once all packages have been built, the build manager scans the volume for `.pkg.tar.zst` files and moves them into the repository.


## Setup (Container)
1. Make sure you meet the follow prerequisites
    - Docker + Docker Compose have been installed
2. Clone this repository to your server
3. Make a copy of `example.docker-compose.override.yml` and call it `docker-compose.override.yml`
    - Pick the hosting variant that fits your setup by uncommenting the relevant section
    - **Tip:** These are just suggestions, you can also create your own configuration to fit your setup
4. Make a copy of `example.packagelist.config.json` and call it `packagelist.config.json`
5. Add the packages you want to provide to the `packagelist.json` file
    - You can find documentation about this file at section **Configure packagelist**.
6. Update the repository permissions with `chmod 777 ./repository`
    - **Note:** We are aware that this isn't very secure, this will be improved in the future.
7. Build the container with `docker compose build`
8. Start the container with `docker compose up -d`
9. Set the right permissions with `docker compose exec build-manager bash -c 'chown builder /package-staging; chown builder /aur-package-list'`

The container should now be ready, try visiting your domain and you should see a index page!
This page will also show packages that are available for downloading.

> [!TIP]
> Normally you would have to wait until Monday @ 01:00 for it to start building, but instructions are available in case you want to start the build immediately.
> See the section **Force the build immediately** for more information.


## Setup (Client)
To configure Pacman to use your self-hosted repository, open your `/etc/pacman.conf` file and add the following repository:

```
[docker-aur-cache]
SigLevel = Optional
Server = http://docker-aur-cache.localhost/
```

> [!NOTE]
> Don't forget to update the URL to your configured URL.

And that should be it!
Simply perform a full system update and you should be able to install packages that are hosted by your instance.


## Configure packagelist
The `packagelist.config.json` file is a JSON formatted file that will be used to configure all sorts of things, like which packages you want to build, the tweaks these packages need, limit system resources given to the builder, etc.

### Packagelist config description
This is the root of the `packagelist.config.json` file.

| **Field**      | **Required** | **Type**                   | **Description**                                                                   |
|----------------|--------------|----------------------------|-----------------------------------------------------------------------------------|
| `builderLimit` | Yes          | `builder limit object`     | Defines how many system resources the builder instance is allowed to use.         |
| `packages`     | Yes          | `array of package objects` | An array of packages that you want to be build each time the builder is executed. |


### Builder limit object description
This object is used to limit how many system resources the builder instance is allowed to use.

| **Field**      | **Required** | **Type** | **Description**                                                                                                                                                                    |
|----------------|--------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `maxBuildTime` | Yes          | `string` | Defines how long the build process is allowed to run for 1 package before it's terminated. The format is `1234X`, where X determines the scale. Allowed scales are `s`, `m`, `h` . |
| `cpusetCpus`   | Yes          | `string` | Defines which CPU cores it's allowed to use. It can be a list _(`0,1,2,3`)_ of cores or a range of cores _(`0-3`)_.                                                                |
| `memory`       | Yes          | `string` | Defines how much memory it's allowed to use before it's terminated. The format is `1234X`, where X determines the scale. Allowed scales are `b`, `k`, `m`, `g`.                    |


### Package object description
This object is used to define the settings in order to build one specific package.

| **Field**                | **Required** | **Type**               | **Description**                                                                                                            |
|--------------------------|--------------|------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `enabled`                | Yes          | `boolean`              | Defines if this package should be build or not, can be used to temporarily stop building a specific package.               |
| `packageName`            | Yes          | `string`               | Defines the name of the AUR package that should be build.                                                                  |
| `resolveDependenciesAs`  | No           | `object`               | A key-value mapping where the key is the original dependency, and the value is the replacement package that should be used.|
| `runCommandsBeforeBuild` | No           | `array of strings`     | An array of shell commands to be executed before the package build process starts.                                         |

> [!TIP]
> The build process is executed in a separate container for each AUR package, which is destroyed after the build is complete.
> If you for example run a command for `package-a` to import a key that `package-b` will also need, you will have to add that command also to the configuration of `package-b`.


## Tips
### Force the build immediately
If you want the container to start building right now, you can run the following command:

`docker compose exec --user builder build-manager bash /repository-builder/build-packages.sh`

It should now start building your packages, wait for this process to finish and then you can install the packages you configured.


### Download older version of AUR package
If you need to downgrade a specific package for some reason, you can find older version in the `archive` directory of the webserver that is hosting the packages.

Simply download the package from there and then install it manually with `pacman -U some-package-1.0.0-x86_64.pkg.tar.zst`.

> [!WARNING]
> Older versions of packages are automatically cleaned up after 30 days to preserve storage space on your server.


### Package build fails with a SIGKILL
Chances are that the build process consumed too much memory and was killed by the Docker engine or the host operating system.
The builder process has been given a high OOM score to make sure it is killed first, instead of other _(potentially more crucial)_ applications.

To resolve this, you will have to raise the builder memory limit, free up more RAM on the host machine or upgrade the host machine to have more RAM.

> [!TIP]
> Sometimes the AUR also provides `-bin` _(precompiled binary)_ variants of a package, this could also be a solution to work around the issue.


### Access the build reports
The application generates a report every time it runs the build process, allowing you to more easily troubleshoot troublesome packages.

These reports can be found in the `build-reports` directory of the webserver that is hosting the packages.

> [!TIP]
> For now these are only available in JSON format, but these will become easier to read in a future commit.


