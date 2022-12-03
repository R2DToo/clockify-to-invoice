"""This module/script will gather all of last months timecards from clockify and display them in the console."""
# Created By: Braden Still-Routley (R2DToo)
# Created On: September 8th 2020
# Usage: python3 main.py API_KEY

from datetime import datetime
from calendar import monthrange
import time
import sys
import requests
import os
from dotenv import load_dotenv

def main():
    '''main'''
    load_dotenv()
    user_id = get_user_id()
    # print(user_id)
    workspace_id = get_workspace_id()
    # print(workspace_id)
    timecards = get_timecards(user_id, workspace_id)
    for key, value in timecards.items():
        print(f'{key} = {value}')

def get_user_id():
    '''Returns the current user's id'''
    api_endpoint = '/api/v1/user'
    response = get_request(api_endpoint)
    return response['id']

def get_workspace_id():
    '''Returns the Optimiz Workspace id'''
    api_endpoint = '/api/v1/workspaces'
    response = get_request(api_endpoint)
    return response[0]['id']

def get_timecards(user_id, workspace_id):
    '''Returns this months timecards'''
    today = datetime.today()
    beginning_of_last_month = datetime(today.year, today.month - 1, 1)
    end_of_last_month = datetime(today.year, today.month - 1, monthrange(today.year, today.month - 1)[1], 23, 59)
    print(f'between the dates of {beginning_of_last_month} and {end_of_last_month}')
    start_time = beginning_of_last_month.strftime('%Y-%m-%dT%H:%M:%S.%f%z') + 'Z'
    end_time = end_of_last_month.strftime('%Y-%m-%dT%H:%M:%S.%f%z') + 'Z'
    api_endpoint = f'/api/v1/workspaces/{workspace_id}/user/{user_id}/time-entries?start={start_time}&end={end_time}&page-size=1000&hydrated=true'
    # print(f'api_endpoint: {api_endpoint}')
    response = get_request(api_endpoint)
    timecards_with_project_id = {}
    for timecard in response:
        # print(timecard)
        if timecard['project']['name'] not in timecards_with_project_id.keys():
            timecards_with_project_id[timecard['project']['name']] = 0

        time_value = 0
        time_string = timecard['timeInterval']['duration'].replace('PT', '')
        if 'H' in time_string:
            hours = int(time_string[0:time_string.index('H')])
            time_string = time_string[time_string.index('H') + 1:len(time_string)]
            time_value += hours
        if 'M' in time_string:
            minutes = int(time_string[0:time_string.index('M')])
            time_value += minutes / 60
        timecards_with_project_id[timecard['project']['name']] += time_value
    return timecards_with_project_id

def get_request(api_endpoint):
    '''Wrapper for GET requests to clockify'''
    API_KEY = ''
    if len(sys.argv) - 1 > 0:
        API_KEY = sys.argv[1]
    else:
        API_KEY = os.getenv('CLOCKIFY_API_KEY')
    headers = {'X-Api-Key': API_KEY}
    response = requests.get(f'https://api.clockify.me{api_endpoint}', headers=headers)
    return response.json()

if __name__ == '__main__':
    st = time.time()
    main()
    et = time.time()
    elapsed_time = et - st
    print(f'Execution time: {elapsed_time} seconds')
