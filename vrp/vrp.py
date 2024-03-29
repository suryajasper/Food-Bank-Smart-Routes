from __future__ import print_function
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from flask import Flask, escape, request, render_template, make_response, url_for, redirect, jsonify
import requests

app = Flask(__name__)

SERVER_NAME = 'suryajasper.com'

@app.route('/')
def status():
    return 'Active!'

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

def format_solution(data, manager, routing, solution, addresses, matrix):
    """Prints solution on console."""
    '''penalties'''
    dropped_nodes = []
    for node in range(routing.Size()):
        if routing.IsStart(node) or routing.IsEnd(node):
            continue
        if solution.Value(routing.NextVar(node)) == node:
            dropped_nodes.append(addresses[manager.IndexToNode(node)])

    toReturn = []
    time = []
    #count_dimension = routing.GetDimensionOrDie('count')
    print('started formatting')
    output = ''
    for vehicle_id in range(data['num_vehicles']):
        #index_end = routing.End(vehicle_id)
        #count_dimension.SetCumulVarSoftLowerBound(index_end,2,100000)
        toAppend = []
        index = routing.Start(vehicle_id)
        plan_output = 'Route for vehicle {}: '.format(vehicle_id)
        route_distance = 0
        while not routing.IsEnd(index):
            plan_output += '{}|'.format(addresses[manager.IndexToNode(index)])
            toAppend.append(addresses[manager.IndexToNode(index)])
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_distance += routing.GetArcCostForVehicle(
                previous_index, index, vehicle_id)
        plan_output += '\n'
        output += plan_output
        time.append(route_distance)
        toReturn.append(toAppend)
    with open('vrplogaddresses.out', 'w') as cout:
        cout.write(output)
    toReturnFin = {}
    toReturnFin['routes'] = toReturn
    toReturnFin['times'] = time
    toReturnFin['dropped'] = dropped_nodes
    toReturnFin['addresses'] = addresses
    toReturnFin['matrix'] = matrix
    print('done formatting', toReturnFin['dropped'])
    return toReturnFin

def main(matrix, num_vehicles, addresses, maxTime, maxDeliv):
    """Solve the CVRP problem."""
    # Instantiate the data problem.
    data = create_data_model(matrix, num_vehicles, maxDeliv)

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
    routing.AddDimension(
        transit_callback_index,
        5,  # no slack
        maxTime,  # vehicle maximum travel distance
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

    penalty = 1000
    for node in range(1, len(data['distance_matrix'])):
        routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

    # Setting first solution heuristic.
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.time_limit.seconds = 15
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    # Solve the problem.
    solution = routing.SolveWithParameters(search_parameters)

    # Print solution on console.
    if solution:
        return format_solution(data, manager, routing, solution, addresses, matrix)
    else:
        print('no solution')
        return {'error': 'no solution'}

@app.route('/vrp',  methods=['POST', 'GET'])
def vrp():
    if request.method == 'POST':
        json = request.get_json(force=True)
        response = main(json['matrix'], int(json['options']['numDeliv']), json['options']['formattedAddresses'], int(json['options']['maxTravelTime']), int(json['options']['maxDestinations']))
        return response

if __name__ == '__main__':
   app.run(host='0.0.0.0', port=4003)
