import urllib.request
import json

def test_url(url, method='GET', data=None):
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header('Content-Type', 'application/json')
            resp = urllib.request.urlopen(req, data=json.dumps(data).encode('utf-8'))
        else:
            resp = urllib.request.urlopen(req)
        print(f'[OK] {url} -> Status {resp.status}')
        return resp.read().decode('utf-8')
    except Exception as e:
        print(f'[ERR] {url} -> {e}')
        return None

test_url('http://localhost:3000/')
test_url('http://localhost:3000/home')
test_url('http://localhost:3000/generator')
test_url('http://localhost:3000/explore')
test_url('http://localhost:3000/college/IITB')
test_url('http://localhost:3000/nirf')
test_url('http://localhost:3000/branches')
test_url('http://localhost:3000/about')
test_url('http://localhost:3000/admin/login')

# Test API Generate
gen_resp = test_url('http://localhost:3000/api/generate', method='POST', data={
    'jeeMainRank': 14200,
    'jeeAdvRank': 5100,
    'category': 'OPEN',
    'genderPool': 'Gender-Neutral',
    'homeState': 'Rajasthan',
    'priorityOrder': ['branch', 'nirf', 'placement'],
    'selectedBranches': ['Computer Science and Engineering', 'Electronics and Communication Engineering'],
    'instituteType': 'ALL',
    'ambitiousOnTop': True
})
if gen_resp:
    res_data = json.loads(gen_resp)
    cid = res_data.get('choiceListId')
    print(f'[OK] /api/generate created list #{cid} with {len(res_data.get("choices", []))} choices')
    test_url(f'http://localhost:3000/result/{cid}')
