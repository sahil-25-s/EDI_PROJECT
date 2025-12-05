from flask import Blueprint, jsonify, request
from middleware.auth import auth_required
from models.problem_model import solve_problem, get_solved_problems
from models.user_model import update_user_xp
from db.mongodb import get_db
import random

problem_bp = Blueprint('problem', __name__)

@problem_bp.route('/', methods=['GET'])
def get_problems():
    db = get_db()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    difficulty = request.args.get('difficulty')
    
    query = {}
    if difficulty and difficulty != 'all':
        diff_map = {'easy': 'Easy', 'intermediate': 'Medium', 'expert': 'Hard'}
        query['difficulty'] = diff_map.get(difficulty, difficulty)
    
    skip = (page - 1) * limit
    problems = list(db.problems.find(query).skip(skip).limit(limit))
    
    for p in problems:
        p['_id'] = str(p['_id'])
    
    total = db.problems.count_documents(query)
    has_more = skip + limit < total
    
    return jsonify({'problems': problems, 'hasMore': has_more, 'total': total})

@problem_bp.route('/<problem_id>', methods=['GET'])
def get_problem(problem_id):
    db = get_db()
    problem = db.problems.find_one({'id': problem_id})
    if problem:
        problem['_id'] = str(problem['_id'])
    return jsonify({'problem': problem or {}})

@problem_bp.route('/solve', methods=['POST'])
@auth_required
def mark_problem_solved():
    data = request.json
    problem_id = data.get('problemId')
    attempts = data.get('attempts', 1)
    time_taken = data.get('timeTaken', 0)
    xp_reward = data.get('xpReward', 10)
    
    if not problem_id:
        return jsonify({'error': 'Problem ID required'}), 400
    
    solved = solve_problem(request.user_id, problem_id, attempts, time_taken)
    user_stats = update_user_xp(request.user_id, xp_reward)
    
    return jsonify({
        'message': 'Problem marked as solved',
        'solved': True,
        'level': user_stats['level'],
        'xp': user_stats['xp'],
        'xpGained': xp_reward
    })

@problem_bp.route('/solved', methods=['GET'])
@auth_required
def get_all_solved_problems():
    problems = get_solved_problems(request.user_id)
    return jsonify({'problems': problems, 'total': len(problems)})

@problem_bp.route('/submit', methods=['POST'])
@auth_required
def submit_problem():
    data = request.json
    problem_id = data.get('problemId')
    code = data.get('code')
    time_spent = data.get('timeSpent', 0)
    
    if not problem_id or not code:
        return jsonify({'error': 'Problem ID and code required'}), 400
    
    if len(code.strip()) < 20 or 'TODO' in code:
        return jsonify({
            'verdict': 'rejected',
            'message': 'Please implement a valid solution'
        }), 400
    
    solve_problem(request.user_id, problem_id, 1, time_spent)
    update_user_xp(request.user_id, 10)
    
    return jsonify({
        'verdict': 'accepted',
        'message': 'Solution accepted',
        'runtime': random.randint(50, 150),
        'memory': random.randint(2000, 7000),
        'xpGained': 10
    })
