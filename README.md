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

## Setup (Container)

1. Make sure you meet the follow prerequisites - Docker + Docker Compose have been installed - The [Traefik reverse proxy container](https://github.com/CrazyVito11/traefik-reverse-proxy) has been configured - A registered domain name - You can use something like [PiHole](https://github.com/pi-hole/pi-hole) to register local domains if you aren't going to host it publicly

   > [!TIP]
   > While this container was designed to work with Traefik and a domain name, the default production compose file should work without.
   > Allowing you to skip the requirement of needing both Traefik and a domain name to host this application.
   >
   > See the section **Bind NGINX to port instead of Traefik** for instructions.

2. Create a folder, preferably one called `docker-aur-cache`
3. Run `curl -fsSL https://raw.githubusercontent.com/CrazyVito11/docker-aur-cache/refs/heads/master/setup.sh | sh`
   - This script wil create the following files and folders: `./repository/`, `./assets/nginx-default.conf`, `.env` & `packagelist.json`.
4. Make changes to the `.env` file if needed
5. Add the packages you want to provide to the `packagelist.json` file
   - You can find documentation about this file at section **Configure packagelist**.
6. Run the container with `docker compose up -d`
   - If you don't have a prebuild image, don't forget to build it first using `docker compose build`

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
| -------------- | ------------ | -------------------------- | --------------------------------------------------------------------------------- |
| `builderLimit` | Yes          | `builder limit object`     | Defines how many system resources the builder instance is allowed to use.         |
| `packages`     | Yes          | `array of package objects` | An array of packages that you want to be build each time the builder is executed. |

### Builder limit object description

This object is used to limit how many system resources the builder instance is allowed to use.

| **Field**      | **Required** | **Type** | **Description**                                                                                                                                                                    |
| -------------- | ------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxBuildTime` | Yes          | `string` | Defines how long the build process is allowed to run for 1 package before it's terminated. The format is `1234X`, where X determines the scale. Allowed scales are `s`, `m`, `h` . |
| `cpusetCpus`   | Yes          | `string` | Defines which CPU cores it's allowed to use. It can be a list _(`0,1,2,3`)_ of cores or a range of cores _(`0-3`)_.                                                                |
| `memory`       | Yes          | `string` | Defines how much memory it's allowed to use before it's terminated. The format is `1234X`, where X determines the scale. Allowed scales are `b`, `k`, `m`, `g`.                    |

### Package object description

This object is used to define the settings in order to build one specific package.

| **Field**                | **Required** | **Type**           | **Description**                                                                                                             |
| ------------------------ | ------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `packageName`            | Yes          | `string`           | Defines the name of the AUR package that should be build.                                                                   |
| `resolveDependenciesAs`  | No           | `object`           | A key-value mapping where the key is the original dependency, and the value is the replacement package that should be used. |
| `runCommandsBeforeBuild` | No           | `array of strings` | An array of shell commands to be executed before the package build process starts.                                          |

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

### Bind NGINX to port instead of Traefik

While it's intended to be used with my Traefik container, it does increase the steps needed to get this application up and running, and it might not even be possible in certain situations.

With a couple of modifications to the `docker-compose.yml` file you can skip the need for Traefik and a domain name, and just connect directly to a TCP port instead.

1. Remove the entire `networks` section at the bottom, as we no longer need that external network.
2. Remove the `labels` section from the `nginx` container.
3. Remove the `traefik-reverse-proxy` network from the `nginx` container.
4. Add a `ports` section to the `nginx` container and bind the port you want to use to `80` on the container.
   - **Example:** `- 8080:80` to bind it to port `8080` on your host machine.

It should now be accessible on your desired TCP port without having to set up my Traefik configuration as well.
