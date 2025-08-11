import fs from 'fs';
import Docker from 'dockerode';
import { execSync } from 'child_process';
import ParameterHelper from './Helpers/ParameterHelper';
import BuilderHelper from './Helpers/BuilderHelper';
import DockerHelper from './Helpers/DockerHelper';
import TimeHelper from './Helpers/TimeHelper';
import FilesystemHelper from './Helpers/FilesystemHelper';
import ValidatorHelper from './Helpers/ValidatorHelper';
import PackagelistConfigHelper from './Helpers/PackagelistConfigHelper';
import LineTransformer from './Transformers/LineTransformer';
import ContainerStatsTransformer from './Transformers/ContainerStatsTransformer';
import PackageListConfiguration from './Types/PackageListConfiguration';
import PackageBuildReport from './Types/PackageBuildReport';
import PackageBuildReportLogLine from './Types/PackageBuildReportLogLine';
import ContainerStatsLine from './Types/ContainerStatsLine';

const params = ParameterHelper.getParameters();
const docker = new Docker({socketPath: '/var/run/docker.sock'});


const paramsValidationMessages = ValidatorHelper.validateObject(
    ParameterHelper.getParameterValidationRules(),
    params
);

if (Object.keys(paramsValidationMessages).length) {
    console.error("Some parameters are missing or invalid");
    console.error(ValidatorHelper.stringifyValidationMessages(paramsValidationMessages));

    process.exit(1);
}


const packageListConfigurationJson = fs.readFileSync(params.packagelist_configuration_path, 'utf8');
const packageListConfiguration = <PackageListConfiguration>JSON.parse(packageListConfigurationJson);

const packageListConfigurationValidationMessages = ValidatorHelper.validateObject(
    PackagelistConfigHelper.getPackagelistConfigValidationRules(),
    packageListConfiguration
);

if (Object.keys(packageListConfigurationValidationMessages).length) {
    console.error("The packagelist configuration is invalid");
    console.error(ValidatorHelper.stringifyValidationMessages(packageListConfigurationValidationMessages));

    process.exit(1);
}



const packageBuildReports: Array<PackageBuildReport> = [];

console.log(`[build-manager] Builder image name: ${params.builder_image_name}`);
console.log(`[build-manager] Packagelist configuration path: ${params.packagelist_configuration_path}`);
console.log(`[build-manager] Builder directory: ${params.builder_dir}`);
console.log(`[build-manager] Build report directory: ${params.build_report_dir}`);
console.log(`[build-manager] Repository archive directory: ${params.repository_archive_dir}`);
console.log(`[build-manager] Repository directory: ${params.repository_dir}`);
console.log(`[build-manager] Repository name: ${params.repository_name}`);



const removeOldDockerImage = async () => {
    console.log("[build-manager] Removing old builder Docker images");

    const dockerImages = await docker.listImages({
        filters: {
            reference: [
                params.builder_image_name
            ]
        }
    });

    dockerImages.forEach(dockerImage => {
        console.log(`[build-manager] Removing Docker image ID ${dockerImage.Id}`);

        docker.getImage(dockerImage.Id).remove({ force: true })
    });

    console.log("[build-manager] Old builder Docker images have been removed");
}

const buildNewDockerImage = async () => {
    console.log("[build-manager] Building a fresh builder Docker image");

    const buildSteam = await docker.buildImage(
        {
            src: DockerHelper.getAllFilesInDirectoryWithoutDockerignore(params.builder_dir),
            context: params.builder_dir
        },
        {
            version: "1",
            t: params.builder_image_name,
            nocache: true,
            forcerm: true,
            rm: true,
        }
    );

    await new Promise<void>((resolve, reject) => {
        docker.modem.followProgress(
            buildSteam,
            (_, res) => {
                const lastConsoleResponse = res.reverse()[0];

                if (lastConsoleResponse && 'error' in lastConsoleResponse) {
                    reject();

                    return;
                }

                resolve();
            },
            (progress) => 'stream' in progress ? process.stdout.write(progress.stream) : null
        );
    });

    console.log("[build-manager] Builder Docker image is ready!");
}

const stopAllBuilderInstances = async () => {
    console.log("[build-manager] Stopping old builder containers");

    const dockerImages = await docker.listImages({
        filters: {
            reference: [
                params.builder_image_name
            ]
        }
    });

    const containers = await docker.listContainers();

    for (const dockerImage of dockerImages) {
        for (const container of containers) {
            if (container.ImageID === dockerImage.Id) {
                console.log(`[build-manager] Stopping container ${container.Id}`);

                await docker.getContainer(container.Id).remove({ force: true });
            }
        }
    }

    console.log("[build-manager] Old builder containers have been stopped");
}

const prepareAurPackageList = async (): Promise<string> => {
    console.log("[build-manager] Preparing the AUR package list");

    execSync(`cd /aur-package-list; curl https://aur.archlinux.org/packages-meta-ext-v1.json.gz -O; gzip -d -f packages-meta-ext-v1.json.gz; ls -al packages-meta-ext-v1.json`);

    console.log("[build-manager] The AUR package list is ready");

    return '/aur-package-list/packages-meta-ext-v1.json';
}

const moveOldPackagesToArchive = async () => {
    console.log("[build-manager] Moving old packages to the archive");

    if (! FilesystemHelper.getFileCountInDirectoryByFileExtension(params.repository_dir, 'pkg.tar.zst')) {
        console.log("[build-manager] Seems like there are no packages that need to be archived");

        return;
    }

    execSync(`mv ${params.repository_dir}/*.pkg.tar.zst ${params.repository_archive_dir}/`);

    console.log("[build-manager] Old packages have been archived");
}

const publishBuildPackages = async () => {
    console.log("[build-manager] Copying new packages");

    if (! FilesystemHelper.getFileCountInDirectoryByFileExtension(params.package_staging_dir, 'pkg.tar.zst')) {
        console.warn("[build-manager] Hmmmm, seems like there are no packages available in the staging area, maybe all the packages failed to build?");

        return;
    }

    execSync(`mv ${params.package_staging_dir}/*.pkg.tar.zst ${params.repository_dir}/`);

    console.log("[build-manager] Removing old database (if iparams.repository_namet exists)");
    execSync(`rm -f ${params.repository_dir}/${params.repository_name}.db* ${params.repository_dir}/${params.repository_name}.files*`);

    console.log("[build-manager] Adding packages to database");
    execSync(`repo-add ${params.repository_dir}/${params.repository_name}.db.tar.gz ${params.repository_dir}/*.pkg.tar.zst`);
}

const handlePackageList = async (aurPackageListPath: string) => {
    const maximumBuildTime = TimeHelper.stringifiedTimeDurationToSeconds(packageListConfiguration.builderLimit.maxBuildTime);

    for await (const packageConfiguration of packageListConfiguration.packages) {
        console.log(`[build-manager] Processing "${packageConfiguration.packageName}"`);

        const packageBuildStartTime = new Date();
        let packageBuildTimeout = null;

        const packageBuildReport: PackageBuildReport = {
            configuration: packageConfiguration,
            success: false,
            buildStartTime: packageBuildStartTime,
            buildEndTime: new Date(),
            containerStats: [],
            logs: [],
        };

        if (packageConfiguration.enabled) {params.repository_name
            try {
                const command = BuilderHelper.getBuilderStartCommand(aurPackageListPath, packageConfiguration);

                console.log(`[build-manager] Starting the container with the following command: ${command}`);

                const container = await docker.createContainer({
                    Image: params.builder_image_name,
                    AttachStdout: true,
                    AttachStderr: true,
                    User: 'builder',
                    Cmd: ['/bin/bash', '-c', command],
                    HostConfig: {
                        OomScoreAdj: 1000, // Make it more likely the builder will be killed in low RAM situations instead of (potentially more crucial) applications
                        Mounts: BuilderHelper.getBuilderMounts(params.repository_name),
                        CpusetCpus: packageListConfiguration.builderLimit.cpusetCpus,
                        Memory: FilesystemHelper.stringifiedSizeToBytes(packageListConfiguration.builderLimit.memory)
                    }
                });

                // Automatically discard the container if it takes too long
                packageBuildTimeout = setTimeout(async () => {
                    console.error(`[build-manager] The package took too long to build, aborting`);

                    packageBuildReport.logs.push({
                        type: 'error',
                        value: 'The package took too long to build, aborting'
                    });

                    await stopAllBuilderInstances();
                }, maximumBuildTime * 1000);

                await container.start();

                container.attach({stream: true, stdout: true, stderr: true}, function (_, stream) {
                    const lineTransformer = new LineTransformer();

                    if (! stream) {
                        return;
                    }

                    stream.pipe(lineTransformer);

                    container.modem.demuxStream(stream, process.stdout, process.stderr);

                    lineTransformer.on('data', (line: PackageBuildReportLogLine) => {
                        packageBuildReport.logs.push(line);
                    });
                });

                container.stats({stream: true}, function (_, stream) {
                    const containerStatsTransformer = new ContainerStatsTransformer();

                    if (! stream) {
                        return;
                    }

                    stream.pipe(containerStatsTransformer);

                    containerStatsTransformer.on('data', (line: ContainerStatsLine) => {
                        packageBuildReport.containerStats.push(line);
                    });
                });

                // Wait for the container to finish it's job
                await container.wait();

                await container.remove();
            } catch (e) {
                console.error(`[build-manager] Something went wrong while building`, e);

                // We are not sure if the container also stopped properly
                // So with this we are sure that no builders are still running
                await stopAllBuilderInstances();
            }
        } else {
            const packageSkippedMessage = `Package "${packageConfiguration.packageName}" has been set to disabled, skipping...`;

            console.log(`[build-manager] ${packageSkippedMessage}`);

            packageBuildReport.logs.push({
                type: 'error',
                value: packageSkippedMessage
            });
        }

        // Stop the timeout timer
        if (packageBuildTimeout) {
            clearTimeout(packageBuildTimeout);
        }

        const packageBuildEndTime = new Date();
        const formattedTime = TimeHelper.getFormattedTimeDifference(packageBuildStartTime, packageBuildEndTime);

        packageBuildReport.buildEndTime = packageBuildEndTime;

        // Grab the last log item to see if it failed
        if (packageBuildReport.logs.length) {
            const lastLogItem = packageBuildReport.logs.slice(-1).pop()!;

            packageBuildReport.success = lastLogItem.type === "standard";
        }

        packageBuildReports.push(packageBuildReport);

        console.log(`[build-manager] Done processing "${packageConfiguration.packageName}", Building took ${formattedTime}`);
    }
}

const generateBuildReport = async () => {
    console.log("[build-manager] Generating build report");

    const currentDate = new Date();
    const formattedDate = TimeHelper.getFormattedDateTimeForFilename(currentDate);

    fs.writeFileSync(
        `${params.build_report_dir}/build-report-${formattedDate}.json`,
        JSON.stringify(packageBuildReports)
    );

    console.log("[build-manager] The build report has been generated");
};

const startBuilding = async () => {
    const aurPackageListPath = await prepareAurPackageList();

    await stopAllBuilderInstances();
    await removeOldDockerImage();
    await buildNewDockerImage();

    await handlePackageList(aurPackageListPath);

    await moveOldPackagesToArchive();
    await publishBuildPackages();
    await generateBuildReport();
}

const startTime = new Date();

startBuilding().then(() => {
    const endTime = new Date();
    const formattedTime = TimeHelper.getFormattedTimeDifference(startTime, endTime);

    console.log(`[build-manager] We are done here! Building took ${formattedTime}`);
});
