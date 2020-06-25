from __future__ import print_function
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from flask import Flask, escape, request, render_template, make_response, url_for, redirect, jsonify
import requests

app = Flask(__name__)

SERVER_NAME = 'suryajasper.com'

@app.route('/')
def hello_world():
    return 'Hello, World!'

def create_data_model(matrix, num_vehicles, max_routes):
    """Stores the data for the problem."""
    data = {}
    data['distance_matrix'] = matrix
    data['num_vehicles'] = num_vehicles
    data['depot'] = 0
    data['demands'] = [1 for x in range(len(matrix))]
    data['demands'][0] = 0
    data['vehicle_capacities'] = [max_routes for veh in range(num_vehicles)]
    return data

def format_solution(data, manager, routing, solution, addresses):
    """Prints solution on console."""
    toReturn = []
    time = []
    #count_dimension = routing.GetDimensionOrDie('count')
    print('started formatting')
    for vehicle_id in range(data['num_vehicles']):
        #index_end = routing.End(vehicle_id)
        #count_dimension.SetCumulVarSoftLowerBound(index_end,2,100000)
        toAppend = []
        index = routing.Start(vehicle_id)
        route_distance = 0
        while not routing.IsEnd(index):
            toAppend.append(addresses[manager.IndexToNode(index)])
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(
                previous_index, index, vehicle_id)
        time.append(route_distance)
        toReturn.append(toAppend)
    toReturnFin = {}
    toReturnFin['routes'] = toReturn
    toReturnFin['times'] = time
    print('done formatting')
    return toReturnFin

def main(matrix, num_vehicles, addresses, maxTime):
    """Solve the CVRP problem."""
    # Instantiate the data problem.
    data = create_data_model(matrix, num_vehicles)

    # Create the routing index manager.
    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']),
                                           data['num_vehicles'], data['depot'])

    # Create Routing Model.
    routing = pywrapcp.RoutingModel(manager)


    # Create and register a transit callback.
    def distance_callback(from_index, to_index):
        """Returns the distance between the two nodes."""
        # Convert from routing variable Index to distance matrix NodeIndex.
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)

    # Define cost of each arc.
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    dimension_name = 'Distance'
    toMakeTravelDistance = 3000
    routing.AddDimension(
        transit_callback_index,
        0,  # no slack
        toMakeTravelDistance,  # vehicle maximum travel distance
        True,  # start cumul to zero
        dimension_name)
    distance_dimension = routing.GetDimensionOrDie(dimension_name)
    distance_dimension.SetGlobalSpanCostCoefficient(100)

    def demand_callback(from_index):
        """Returns the demand of the node."""
        # Convert from routing variable Index to demands NodeIndex.
        from_node = manager.IndexToNode(from_index)
        return data['demands'][from_node]
    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    routing.AddDimensionWithVehicleCapacity(demand_callback_index,
        0,  # null capacity slack
        data['vehicle_capacities'],  # vehicle maximum capacities
        True,  # start cumul to zero
        'Capacity')

    # Setting first solution heuristic.
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.time_limit.seconds = 60
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    # Solve the problem.
    solution = routing.SolveWithParameters(search_parameters)

    # Print solution on console.
    if solution:
        return format_solution(data, manager, routing, solution, addresses)
    else:
        print('no solution')
        return {'error': 'no solution'}

@app.route('/vrp',  methods=['POST', 'GET'])
def vrp():
	if request.method == 'POST':
		json = request.get_json(force=True)
        response = main(json['matrix'], int(json['options']['delivererCount']), json['options']['formattedAddresses'], json['options']['maxTime'])
		return response

if __name__ == '__main__':
   app.run(host='0.0.0.0', port=4003)
