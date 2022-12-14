import * as THREE from 'three';
import { ISpawnPoint } from '../interfaces/ISpawnPoint';
import { World } from '../world/World';
import { Helicopter } from '../vehicles/Helicopter';
import { Airplane } from '../vehicles/Airplane';
import { Car } from '../vehicles/Car';
import * as Utils from '../core/FunctionLibrary';
import { Vehicle } from '../vehicles/Vehicle';
import { Character } from '../characters/Character';
import { FollowPath } from '../characters/character_ai/FollowPath';
import { LoadingManager } from '../core/LoadingManager';
import { IWorldEntity } from '../interfaces/IWorldEntity';

export class VehicleSpawnPoint implements ISpawnPoint
{
	public type: string;
	public driver: string;
	public firstAINode: string;
	public playerId: string;

	private object: THREE.Object3D;

	constructor(object: THREE.Object3D)
	{
		this.object = object;
	}

	public getUserData(): any
	{
		return this.object.userData;
	}

	public setUserData(data: any): void
	{
		this.object.userData = data;
		this.type = data.type;
		this.firstAINode = undefined; //data.first_node;
		this.driver = data.driver;
		this.playerId = data.playerId;
	}

	public spawn(loadingManager: LoadingManager, world: World): void
	{
		// console.log(this);
		loadingManager.loadGLTF('build/assets/' + this.type + '.glb', (model: any) =>
		{
			let vehicle: Vehicle = this.getNewVehicleByType(model, this.type);
			vehicle.spawnPoint = this.object;
			vehicle.playerId = this.playerId;
			vehicle.displayName();

			let worldPos = new THREE.Vector3();
			let worldQuat = new THREE.Quaternion();
			this.object.getWorldPosition(worldPos);
			this.object.getWorldQuaternion(worldQuat);

			vehicle.setPosition(worldPos.x, worldPos.y + 1, worldPos.z);
			vehicle.collision.quaternion.copy(Utils.cannonQuat(worldQuat));
			// console.log("===   ===VehicleSpawnPoint: Add Vehicle", vehicle);

			world.add(vehicle);

			if (this.driver !== undefined)
			{
				loadingManager.loadGLTF('build/assets/boxman.glb', (charModel) =>
				{
					let character = new Character(charModel);
					// console.log("===   ===VehicleSpawnPoint: Add Charactor", character);
					world.add(character);
					character.teleportToVehicle(vehicle, vehicle.seats[0]);

					if (this.driver === 'player')
					{
						// console.log("===   ===VehicleSpawnPoint: player");
						character.takeControl();
					}
					else if (this.driver === 'ai')
					{
						// console.log("===   ===VehicleSpawnPoint: ai");
						if (this.firstAINode !== undefined)
						{
							let nodeFound = false;
							for (const pathName in world.paths) {
								if (world.paths.hasOwnProperty(pathName)) {
									const path = world.paths[pathName];
									
									console.log("===   ===VehicleSpawnPoint: path", path);
									for (const nodeName in path.nodes) {
										if (Object.prototype.hasOwnProperty.call(path.nodes, nodeName)) {
											const node = path.nodes[nodeName];
											
											if (node.object.name === this.firstAINode)
											{
												character.setBehaviour(new FollowPath(node, 10));
												nodeFound = true;
											}
										}
									}
								}
							}

							if (!nodeFound)
							{
								console.error('Path node ' + this.firstAINode + 'not found.');
							}
						}
					}
				});
			}
		});
	}

	private getNewVehicleByType(model: any, type: string): Vehicle
	{
		switch (type)
		{
			case 'car': return new Car(model);
			case 'heli': return new Helicopter(model);
			case 'airplane': return new Airplane(model);
		}
	}
}